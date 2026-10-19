import type { DrawnCard, Mode } from './game'

export type Phase = 'lobby' | 'game'

export interface RoomPlayer {
  id: string
  name: string
  avatar: string
  connected: boolean
}

export interface RoomState {
  code: string
  hostId: string
  mode: Mode
  phase: Phase
  players: RoomPlayer[]
  card: DrawnCard | null
  turnId: string | null
  deadline: number | null
  punishment: { playerId: string; text: string } | null
}

export type Verdict = 'complete' | 'tapout' | 'skip'

export interface Profile {
  playerId: string
  name: string
  avatar: string
}

export interface ClientToServer {
  create_room: (p: Profile & { mode: Mode }, ack: (r: { ok: true; state: RoomState } | { ok: false; error: string }) => void) => void
  join_room: (p: Profile & { code: string }, ack: (r: { ok: true; state: RoomState } | { ok: false; error: string }) => void) => void
  leave_room: () => void
  start_game: () => void
  verdict: (v: Verdict) => void
  punishment_done: () => void
}

export interface ServerToClient {
  room_state: (state: RoomState) => void
  room_closed: (reason: string) => void
  notice: (text: string) => void
}
