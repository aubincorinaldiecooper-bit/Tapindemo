import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Mode } from './game'
import type { ClientToServer, RoomState, ServerToClient, Verdict } from './protocol'

export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'

const PLAYER_KEY = 'tapin.playerId'

export function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PLAYER_KEY, id)
  }
  return id
}

export function roomFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('room')
  return code && /^\d{4}$/.test(code) ? code : null
}

export function shareLinkFor(code: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}?room=${code}`
}

type Ack = { ok: true; state: RoomState } | { ok: false; error: string }
type RoomSocket = Socket<ServerToClient, ClientToServer>

export function useRoom(onClosed: (reason: string) => void, onState: (state: RoomState) => void) {
  const socketRef = useRef<RoomSocket | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [connected, setConnected] = useState(false)
  const closedRef = useRef(onClosed)
  const stateRef = useRef(onState)
  useEffect(() => {
    closedRef.current = onClosed
    stateRef.current = onState
  })
  const apply = useCallback((st: RoomState) => {
    setState(st)
    stateRef.current(st)
  }, [])

  useEffect(() => {
    const s: RoomSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = s
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('room_state', apply)
    s.on('room_closed', (reason) => {
      setState(null)
      closedRef.current(reason)
    })
    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [apply])

  const call = useCallback(
    <E extends 'create_room' | 'join_room'>(event: E, payload: Parameters<ClientToServer[E]>[0]) =>
      new Promise<Ack>((resolve) => {
        const s = socketRef.current
        if (!s) return resolve({ ok: false, error: 'Not connected' })
        const t = window.setTimeout(() => resolve({ ok: false, error: "Couldn't reach the party server" }), 6000)
        ;(s.emit as (ev: E, p: typeof payload, ack: (r: Ack) => void) => void)(event, payload, (r) => {
          window.clearTimeout(t)
          if (r.ok) apply(r.state)
          resolve(r)
        })
      }),
    [apply],
  )

  const createRoom = useCallback((name: string, avatar: string, mode: Mode) => call('create_room', { playerId: getPlayerId(), name, avatar, mode }), [call])
  const joinRoom = useCallback((code: string, name: string, avatar: string) => call('join_room', { playerId: getPlayerId(), name, avatar, code }), [call])
  const startGame = useCallback(() => socketRef.current?.emit('start_game'), [])
  const verdict = useCallback((v: Verdict) => socketRef.current?.emit('verdict', v), [])
  const punishmentDone = useCallback(() => socketRef.current?.emit('punishment_done'), [])
  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave_room')
    setState(null)
  }, [])

  return { state, connected, createRoom, joinRoom, startGame, verdict, punishmentDone, leaveRoom }
}

export function useDeadline(deadline: number | null, paused: boolean) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0))
  useEffect(() => {
    if (!deadline || paused) return
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const t = window.setInterval(tick, 250)
    return () => window.clearInterval(t)
  }, [deadline, paused])
  return deadline ? left : 0
}
