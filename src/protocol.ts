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
  roomName: string
  hostId: string
  mode: Mode
  cardSeconds: number
  phase: Phase
  players: RoomPlayer[]
  card: DrawnCard | null
  turnId: string | null
  deadline: number | null
  punishment: { playerId: string; text: string } | null
  // Set while a head-to-head card is on the table: the two duelists and who has already finished.
  duel: { players: [string, string]; done: string[] } | null
  // Spoken answer to the current card (Phonon transcript). `text` is empty while transcription is in flight.
  answer: { playerId: string; text: string; pending: boolean } | null
  // Every completed spoken answer this party, one per card (re-recording replaces). Survives reloads; feeds the Recap.
  answers: { cardId: number; playerId: string; card: string; text: string }[]
  answersEnabled: boolean
}

export interface DuelAccess {
  url: string
  token: string
  room: string
}

export const TIMER_OPTIONS = [10, 15, 20] as const
export type TimerSeconds = (typeof TIMER_OPTIONS)[number]
export const DEFAULT_TIMER: TimerSeconds = 10

export const MIN_PLAYERS = 2

export type Verdict = 'complete' | 'tapout' | 'skip'

export interface Profile {
  playerId: string
  name: string
  avatar: string
}

// `playerId` is a private token that only its own browser knows; rooms expose a derived public `id`.
export type JoinAck = { ok: true; state: RoomState; me: string } | { ok: false; error: string }

export interface ClientToServer {
  create_room: (p: Profile & { mode: Mode; seconds: number; roomName: string }, ack: (r: JoinAck) => void) => void
  join_room: (p: Profile & { code: string }, ack: (r: JoinAck) => void) => void
  leave_room: () => void
  start_game: () => void
  verdict: (v: Verdict, cardId: number) => void
  punishment_done: () => void
  // 16 kHz mono 16-bit WAV of the player's spoken answer to the current card.
  answer_audio: (cardId: number, wav: ArrayBuffer, ack: (r: { ok: true; text: string } | { ok: false; error: string }) => void) => void
  duel_token: (ack: (r: { ok: true; access: DuelAccess } | { ok: false; error: string }) => void) => void
}

export interface ServerToClient {
  room_state: (state: RoomState) => void
  room_closed: (reason: string) => void
  notice: (text: string) => void
}
