import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { classicPunishmentsList } from '../../src/data'
import { drawCard } from '../../src/game'
import { DEFAULT_TIMER, TIMER_OPTIONS, type ClientToServer, type Profile, type RoomState, type ServerToClient, type Verdict } from '../../src/protocol'

const PORT = Number(process.env.PORT ?? 8787)
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000
const MAX_AVATAR_CHARS = 200_000
const DEFAULT_ORIGINS = 'https://aubincorinaldiecooper-bit.github.io,http://localhost:5173,http://127.0.0.1:5173'
const origins = (process.env.CORS_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((s) => s.trim())
const PUNISHMENT_TIMEOUT_MS = 90_000

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }))
    return
  }
  res.writeHead(404).end()
})

const io = new Server<ClientToServer, ServerToClient>(http, {
  cors: { origin: origins.includes('*') ? true : origins },
  maxHttpBufferSize: 1_000_000,
})

interface Room {
  state: RoomState
  timer?: NodeJS.Timeout
  graceTimer?: NodeJS.Timeout
  emptySince?: number
}

// A refresh or screen lock drops the socket for a moment; wait this long before skipping their turn.
const TURN_GRACE_MS = 10_000

const rooms = new Map<string, Room>()
const socketRoom = new Map<string, { code: string; playerId: string }>()

const newCode = () => {
  for (;;) {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    if (!rooms.has(code)) return code
  }
}

const cleanProfile = (p: Profile) => ({
  playerId: String(p.playerId ?? '').slice(0, 64),
  name: String(p.name ?? '').trim().slice(0, 16) || 'Player',
  avatar: typeof p.avatar === 'string' && p.avatar.length <= MAX_AVATAR_CHARS && /^data:image\/(jpeg|png|webp|svg\+xml);/.test(p.avatar) ? p.avatar : '',
})

const broadcast = (room: Room) => io.to(room.state.code).emit('room_state', room.state)

const clearTimer = (room: Room) => {
  if (room.timer) clearTimeout(room.timer)
  room.timer = undefined
}

const nextTurn = (room: Room) => {
  const s = room.state
  const connected = s.players.filter((p) => p.connected)
  if (connected.length === 0) return
  const idx = connected.findIndex((p) => p.id === s.turnId)
  s.turnId = connected[(idx + 1) % connected.length].id
}

const dealCard = (room: Room, first = false) => {
  const s = room.state
  s.card = drawCard(s.mode, first)
  s.deadline = Date.now() + s.cardSeconds * 1000
  s.punishment = null
  clearTimer(room)
  room.timer = setTimeout(() => tapOut(room), s.cardSeconds * 1000 + 250)
  broadcast(room)
}

const tapOut = (room: Room) => {
  const s = room.state
  if (s.phase !== 'game' || !s.turnId || s.punishment) return
  clearTimer(room)
  s.deadline = null
  s.punishment = { playerId: s.turnId, text: classicPunishmentsList[Math.floor(Math.random() * classicPunishmentsList.length)] }
  // Nobody left to press Done (both punished player and host gone)? Move on by itself.
  room.timer = setTimeout(() => advance(room), PUNISHMENT_TIMEOUT_MS)
  broadcast(room)
}

const advance = (room: Room) => {
  nextTurn(room)
  dealCard(room)
}

const isSocketOf = (code: string, playerId: string, socketId: string) => {
  const ref = socketRoom.get(socketId)
  return !!ref && ref.code === code && ref.playerId === playerId
}

const detach = (socketId: string, explicit: boolean) => {
  const ref = socketRoom.get(socketId)
  socketRoom.delete(socketId)
  if (!ref) return
  const room = rooms.get(ref.code)
  if (!room) return
  const s = room.state
  const player = s.players.find((p) => p.id === ref.playerId)
  if (!player) return
  // The same player may be connected from a second tab; only mark away when the last socket is gone.
  const stillConnected = [...socketRoom.values()].some((r) => r.code === s.code && r.playerId === ref.playerId)
  if (explicit && s.phase === 'lobby') s.players = s.players.filter((p) => p.id !== ref.playerId)
  else if (!stillConnected) player.connected = false
  io.sockets.sockets.get(socketId)?.leave(s.code)
  if (stillConnected) return broadcast(room)
  if (s.players.every((p) => !p.connected)) room.emptySince = Date.now()
  if (s.hostId === ref.playerId) {
    if (explicit && s.phase === 'lobby') {
      io.to(s.code).emit('room_closed', 'The host left the party')
      clearTimer(room)
      rooms.delete(s.code)
      return
    }
    // Host dropped: hand the party to the next connected player so the lobby never locks up.
    const next = s.players.find((p) => p.connected)
    if (next) s.hostId = next.id
  }
  if (s.phase === 'game' && s.turnId === ref.playerId && !s.punishment) {
    if (room.graceTimer) clearTimeout(room.graceTimer)
    room.graceTimer = setTimeout(() => {
      room.graceTimer = undefined
      const turn = s.players.find((p) => p.id === s.turnId)
      if (s.phase === 'game' && turn && !turn.connected && !s.punishment) advance(room)
    }, TURN_GRACE_MS)
  }
  broadcast(room)
}

io.on('connection', (socket) => {
  const current = () => {
    const ref = socketRoom.get(socket.id)
    if (!ref) return null
    const room = rooms.get(ref.code)
    return room ? { room, playerId: ref.playerId } : null
  }

  socket.on('create_room', (p, ack) => {
    const prof = cleanProfile(p)
    const mode = p.mode === 'betchu' ? 'betchu' : 'classic'
    const cardSeconds = (TIMER_OPTIONS as readonly number[]).includes(p.seconds) ? p.seconds : DEFAULT_TIMER
    const code = newCode()
    const room: Room = {
      state: { code, hostId: prof.playerId, mode, cardSeconds, phase: 'lobby', players: [{ id: prof.playerId, name: prof.name, avatar: prof.avatar, connected: true }], card: null, turnId: null, deadline: null, punishment: null },
    }
    rooms.set(code, room)
    socketRoom.set(socket.id, { code, playerId: prof.playerId })
    socket.join(code)
    ack({ ok: true, state: room.state })
  })

  socket.on('join_room', (p, ack) => {
    const prof = cleanProfile(p)
    const code = String(p.code ?? '').replace(/\D/g, '').slice(0, 4)
    const room = rooms.get(code)
    if (!room) return ack({ ok: false, error: 'No party with that code' })
    const prev = socketRoom.get(socket.id)
    if (prev && prev.code !== code) detach(socket.id, false)
    const s = room.state
    const existing = s.players.find((pl) => pl.id === prof.playerId)
    if (existing?.connected && existing.id === s.hostId && !isSocketOf(code, existing.id, socket.id)) {
      return ack({ ok: false, error: 'The host is already in this party' })
    }
    if (existing) {
      if (room.graceTimer && s.turnId === existing.id) {
        clearTimeout(room.graceTimer)
        room.graceTimer = undefined
      }
      existing.connected = true
      existing.name = prof.name
      if (prof.avatar) existing.avatar = prof.avatar
    } else {
      if (s.phase !== 'lobby') return ack({ ok: false, error: 'That party already started' })
      if (s.players.length >= 12) return ack({ ok: false, error: 'That party is full' })
      s.players.push({ id: prof.playerId, name: prof.name, avatar: prof.avatar, connected: true })
    }
    room.emptySince = undefined
    socketRoom.set(socket.id, { code, playerId: prof.playerId })
    socket.join(code)
    ack({ ok: true, state: s })
    broadcast(room)
  })

  socket.on('start_game', () => {
    const c = current()
    if (!c || c.playerId !== c.room.state.hostId || c.room.state.phase !== 'lobby') return
    c.room.state.phase = 'game'
    c.room.state.turnId = c.room.state.hostId
    dealCard(c.room, true)
  })

  socket.on('verdict', (v: Verdict) => {
    const c = current()
    if (!c) return
    const s = c.room.state
    if (s.phase !== 'game' || s.punishment) return
    const isTurn = c.playerId === s.turnId
    const isHost = c.playerId === s.hostId
    if (!isTurn && !isHost) return
    if (v === 'tapout') tapOut(c.room)
    else if (v === 'complete' || v === 'skip') advance(c.room)
  })

  socket.on('punishment_done', () => {
    const c = current()
    if (!c) return
    const s = c.room.state
    if (!s.punishment) return
    if (c.playerId !== s.punishment.playerId && c.playerId !== s.hostId) return
    advance(c.room)
  })

  socket.on('leave_room', () => detach(socket.id, true))
  socket.on('disconnect', () => detach(socket.id, false))
})

setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > EMPTY_ROOM_TTL_MS) {
      clearTimer(room)
      rooms.delete(code)
    }
  }
}, 60_000).unref()

http.listen(PORT, () => console.log(`tapin server on :${PORT}`))
