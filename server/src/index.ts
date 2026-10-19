import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { AccessToken } from 'livekit-server-sdk'
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
const DUEL_TIME_FACTOR = 3
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? ''
const duelsEnabled = !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET)
const DUEL_CHANCE = Number(process.env.DUEL_CHANCE ?? 0.12)
// Phonon-2 (speech-to-text) for spoken card answers. OpenAI-compatible: POST /v1/audio/transcriptions.
const PHONON_URL = (process.env.PHONON_URL ?? '').replace(/\/$/, '')
const PHONON_API_KEY = process.env.PHONON_API_KEY ?? ''
const answersEnabled = !!PHONON_URL
const MAX_ANSWER_BYTES = 700_000 // ~20 s of 16 kHz mono 16-bit WAV

const transcribe = async (wav: ArrayBuffer): Promise<string> => {
  const form = new FormData()
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'answer.wav')
  form.append('model', 'phonon-2')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(`${PHONON_URL}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: PHONON_API_KEY ? { authorization: `Bearer ${PHONON_API_KEY}` } : {},
      body: form,
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`phonon ${res.status}`)
    const data = (await res.json()) as { text?: string }
    return (data.text ?? '').trim()
  } finally {
    clearTimeout(t)
  }
}

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

const publicId = (secret: string) => createHash('sha256').update(secret).digest('base64url').slice(0, 12)

const cleanProfile = (p: Profile) => ({
  playerId: publicId(String(p.playerId ?? '').slice(0, 64)),
  name: String(p.name ?? '').trim().slice(0, 16) || 'Player',
  avatar: typeof p.avatar === 'string' && p.avatar.length <= MAX_AVATAR_CHARS && /^data:image\/(jpeg|png|webp|svg\+xml);/.test(p.avatar) ? p.avatar : '',
})

const broadcast = (room: Room) => io.to(room.state.code).emit('room_state', room.state)

const clearTimer = (room: Room) => {
  if (room.timer) clearTimeout(room.timer)
  room.timer = undefined
}

// Walk the seating order from the current player and stop at the next connected one,
// so an absent player in the middle doesn't reset the order.
const nextTurn = (room: Room) => {
  const s = room.state
  const n = s.players.length
  if (n === 0 || !s.players.some((p) => p.connected)) return
  const start = s.players.findIndex((p) => p.id === s.turnId)
  for (let step = 1; step <= n; step++) {
    const candidate = s.players[(start + step) % n]
    if (candidate.connected) {
      s.turnId = candidate.id
      return
    }
  }
}

const dealCard = (room: Room, first = false) => {
  const s = room.state
  const connected = s.players.filter((p) => p.connected)
  s.card = drawCard(s.mode, first, duelsEnabled && connected.length >= 2, DUEL_CHANCE)
  s.punishment = null
  s.duel = null
  s.answer = null
  let seconds = s.cardSeconds
  if (s.card.kind === 'duel') {
    const others = connected.filter((p) => p.id !== s.turnId)
    const rival = others[Math.floor(Math.random() * others.length)]
    s.duel = { players: [s.turnId!, rival.id], done: [] }
    seconds = s.cardSeconds * DUEL_TIME_FACTOR
  }
  s.deadline = Date.now() + seconds * 1000
  clearTimer(room)
  room.timer = setTimeout(() => (s.duel ? duelTimeout(room) : tapOut(room)), seconds * 1000 + 250)
  broadcast(room)
}

// Time ran out on a head-to-head: whoever hasn't finished takes the punishment (first unfinished one).
const duelTimeout = (room: Room) => {
  const s = room.state
  if (!s.duel || s.punishment) return
  const slacker = s.duel.players.find((id) => !s.duel!.done.includes(id) && s.players.find((p) => p.id === id)?.connected)
  if (!slacker) return advance(room)
  punish(room, slacker)
}

const punish = (room: Room, playerId: string) => {
  const s = room.state
  clearTimer(room)
  s.deadline = null
  s.punishment = { playerId, text: classicPunishmentsList[Math.floor(Math.random() * classicPunishmentsList.length)] }
  room.timer = setTimeout(() => advance(room), PUNISHMENT_TIMEOUT_MS)
  broadcast(room)
}

const tapOut = (room: Room) => {
  const s = room.state
  if (s.phase !== 'game' || !s.turnId || s.punishment) return
  clearTimer(room)
  // Nobody is there to take the punishment; don't block the table for an absent phone.
  if (!s.players.find((p) => p.id === s.turnId)?.connected) return advance(room)
  punish(room, s.turnId)
}

const advance = (room: Room) => {
  nextTurn(room)
  dealCard(room)
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
  io.sockets.sockets.get(socketId)?.leave(s.code)
  if (stillConnected) return
  if (explicit && s.phase === 'lobby') s.players = s.players.filter((p) => p.id !== ref.playerId)
  else player.connected = false
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
      if (s.phase === 'game' && turn && !turn.connected && !s.punishment && !s.duel) advance(room)
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
      state: { code, hostId: prof.playerId, mode, cardSeconds, phase: 'lobby', players: [{ id: prof.playerId, name: prof.name, avatar: prof.avatar, connected: true }], card: null, turnId: null, deadline: null, punishment: null, duel: null, answer: null, answersEnabled },
    }
    rooms.set(code, room)
    socketRoom.set(socket.id, { code, playerId: prof.playerId })
    socket.join(code)
    ack({ ok: true, state: room.state, me: prof.playerId })
  })

  socket.on('join_room', (p, ack) => {
    const prof = cleanProfile(p)
    const code = String(p.code ?? '').replace(/\D/g, '').slice(0, 4)
    const room = rooms.get(code)
    if (!room) return ack({ ok: false, error: 'No party with that code' })
    const s = room.state
    const existing = s.players.find((pl) => pl.id === prof.playerId)
    if (!existing && s.phase !== 'lobby') return ack({ ok: false, error: 'That party already started' })
    if (!existing && s.players.length >= 12) return ack({ ok: false, error: 'That party is full' })
    const prev = socketRoom.get(socket.id)
    if (prev && prev.code !== code) detach(socket.id, false)
    if (existing) {
      if (room.graceTimer && s.turnId === existing.id) {
        clearTimeout(room.graceTimer)
        room.graceTimer = undefined
      }
      existing.connected = true
      existing.name = prof.name
      if (prof.avatar) existing.avatar = prof.avatar
    } else {
      s.players.push({ id: prof.playerId, name: prof.name, avatar: prof.avatar, connected: true })
    }
    room.emptySince = undefined
    socketRoom.set(socket.id, { code, playerId: prof.playerId })
    socket.join(code)
    ack({ ok: true, state: s, me: prof.playerId })
    broadcast(room)
  })

  socket.on('start_game', () => {
    const c = current()
    if (!c || c.playerId !== c.room.state.hostId || c.room.state.phase !== 'lobby') return
    c.room.state.phase = 'game'
    c.room.state.turnId = c.room.state.hostId
    dealCard(c.room, true)
  })

  socket.on('verdict', (v: Verdict, cardId: number) => {
    const c = current()
    if (!c) return
    const s = c.room.state
    if (s.phase !== 'game' || s.punishment) return
    // A double tap that lands after the card changed must not act on the new card.
    if (s.card && cardId !== s.card.id) return
    const isHost = c.playerId === s.hostId
    if (s.duel) {
      const isDuelist = s.duel.players.includes(c.playerId)
      if (v === 'skip' && isHost) return advance(c.room)
      if (!isDuelist) return
      if (v === 'tapout') return punish(c.room, c.playerId)
      if (v === 'complete' && !s.duel.done.includes(c.playerId)) {
        s.duel.done.push(c.playerId)
        if (s.duel.done.length === 2) return advance(c.room)
        broadcast(c.room)
      }
      return
    }
    const isTurn = c.playerId === s.turnId
    if (!isTurn && !isHost) return
    if (v === 'tapout') tapOut(c.room)
    else if (v === 'complete' || v === 'skip') advance(c.room)
  })

  socket.on('answer_audio', async (cardId, wav, ack) => {
    const c = current()
    if (!c) return ack({ ok: false, error: 'Not in a party' })
    const s = c.room.state
    if (!answersEnabled) return ack({ ok: false, error: 'Voice answers are off' })
    if (s.phase !== 'game' || !s.card || s.card.id !== cardId || s.punishment || s.duel) return ack({ ok: false, error: 'That card is over' })
    if (c.playerId !== s.turnId) return ack({ ok: false, error: 'Not your turn' })
    if (!(wav instanceof ArrayBuffer) || wav.byteLength < 1000) return ack({ ok: false, error: 'No audio' })
    if (wav.byteLength > MAX_ANSWER_BYTES) return ack({ ok: false, error: 'Answer too long' })
    s.answer = { playerId: c.playerId, text: '', pending: true }
    broadcast(c.room)
    let text = ''
    try {
      text = await transcribe(wav)
    } catch (e) {
      console.warn('transcription failed', (e as Error).message)
    }
    // The card may have moved on while Phonon was working; don't attach the answer to the next card.
    if (c.room.state.card?.id !== cardId) return ack({ ok: false, error: 'That card is over' })
    s.answer = text ? { playerId: c.playerId, text, pending: false } : null
    broadcast(c.room)
    ack(text ? { ok: true, text } : { ok: false, error: "Couldn't hear that — try again" })
  })

  socket.on('duel_token', async (ack) => {
    const c = current()
    if (!c) return ack({ ok: false, error: 'Not in a party' })
    const s = c.room.state
    if (!duelsEnabled) return ack({ ok: false, error: 'Video is not configured' })
    const duelist = !!s.duel?.players.includes(c.playerId)
    const player = s.players.find((p) => p.id === c.playerId)
    if (!s.duel || !s.card) return ack({ ok: false, error: 'No duel in progress' })
    const roomName = `tapin-${s.code}-${s.card.id}`
    const ttl = s.cardSeconds * DUEL_TIME_FACTOR + 60
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity: c.playerId, name: player?.name, ttl })
    at.addGrant({ roomJoin: true, room: roomName, canPublish: duelist, canSubscribe: true, canPublishData: false })
    ack({ ok: true, access: { url: LIVEKIT_URL, token: await at.toJwt(), room: roomName } })
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
