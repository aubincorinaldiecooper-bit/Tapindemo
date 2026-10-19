import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { classicPunishmentsList } from '../../src/data'
import { drawCard } from '../../src/game'
import type { ClientToServer, Profile, RoomState, ServerToClient, Verdict } from '../../src/protocol'

const PORT = Number(process.env.PORT ?? 8787)
const CARD_SECONDS = 60
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000
const MAX_AVATAR_CHARS = 200_000
const origins = (process.env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim())

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
  emptySince?: number
}

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
  avatar: typeof p.avatar === 'string' && p.avatar.length <= MAX_AVATAR_CHARS ? p.avatar : '',
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
  s.deadline = Date.now() + CARD_SECONDS * 1000
  s.punishment = null
  clearTimer(room)
  room.timer = setTimeout(() => tapOut(room), CARD_SECONDS * 1000 + 250)
  broadcast(room)
}

const tapOut = (room: Room) => {
  const s = room.state
  if (s.phase !== 'game' || !s.turnId || s.punishment) return
  clearTimer(room)
  s.deadline = null
  s.punishment = { playerId: s.turnId, text: classicPunishmentsList[Math.floor(Math.random() * classicPunishmentsList.length)] }
  broadcast(room)
}

const advance = (room: Room) => {
  nextTurn(room)
  dealCard(room)
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
    const code = newCode()
    const room: Room = {
      state: { code, hostId: prof.playerId, mode, phase: 'lobby', players: [{ id: prof.playerId, name: prof.name, avatar: prof.avatar, connected: true }], card: null, turnId: null, deadline: null, punishment: null },
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
    const s = room.state
    const existing = s.players.find((pl) => pl.id === prof.playerId)
    if (existing) {
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

  const drop = (explicit: boolean) => {
    const c = current()
    socketRoom.delete(socket.id)
    if (!c) return
    const s = c.room.state
    const player = s.players.find((p) => p.id === c.playerId)
    if (!player) return
    if (explicit && s.phase === 'lobby') s.players = s.players.filter((p) => p.id !== c.playerId)
    else player.connected = false
    socket.leave(s.code)
    if (s.players.every((p) => !p.connected)) c.room.emptySince = Date.now()
    if (s.phase === 'game' && s.turnId === c.playerId && !s.punishment) advance(c.room)
    else if (s.phase === 'lobby' && s.hostId === c.playerId && explicit) {
      io.to(s.code).emit('room_closed', 'The host left the party')
      clearTimer(c.room)
      rooms.delete(s.code)
      return
    }
    broadcast(c.room)
  }

  socket.on('leave_room', () => drop(true))
  socket.on('disconnect', () => drop(false))
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
