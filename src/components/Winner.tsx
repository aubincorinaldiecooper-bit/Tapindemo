import { motion } from 'motion/react'
import { avatarsList } from '../data'
import type { RoomPlayer, RoomState } from '../protocol'
import { Modal, Pressable } from './ui'

// One laurel branch (left side); the right one is the same branch mirrored.
function Laurel() {
  const cx = 160
  const cy = 128
  const r = 118
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a }
  }
  const start = pt(112)
  const end = pt(242)
  const leaves = Array.from({ length: 9 }, (_, i) => {
    const p = pt(120 + i * 14.5)
    const tangent = (Math.atan2(Math.cos(p.a), -Math.sin(p.a)) * 180) / Math.PI
    const nx = Math.cos(p.a)
    const ny = Math.sin(p.a)
    const rx = 15 - i * 0.5
    return [
      { x: p.x + nx * 10, y: p.y + ny * 10, rot: tangent - 32, rx },
      { x: p.x - nx * 8, y: p.y - ny * 8, rot: tangent + 32, rx: rx - 1.5 },
    ]
  }).flat()
  return (
    <>
      <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={5.6} transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill="currentColor" />
      ))}
    </>
  )
}

interface WinnerProps {
  open: boolean
  inert?: boolean
  results: RoomState['results']
  players: RoomPlayer[]
  isHost: boolean
  locked: boolean
  onAgain: () => void
  onEnd: () => void
}

export function WinnerModal({ open, inert, results, players, isHost, locked, onAgain, onEnd }: WinnerProps) {
  const winners = results ? results.winners.map((id) => players.find((p) => p.id === id)).filter((p): p is RoomPlayer => !!p) : []
  const standings = results ? [...players].sort((a, b) => (results.scores[b.id] ?? 0) - (results.scores[a.id] ?? 0)) : []
  const top = results && winners[0] ? (results.scores[winners[0].id] ?? 0) : 0
  return (
    <Modal open={open && !!results} zIndex={1700} inert={inert} className="winner-modal">
      {results && (
        <>
          <div className="winner-badge">
            <motion.svg className="winner-laurel" viewBox="0 0 320 256" aria-hidden="true" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
              <Laurel />
              <g transform="translate(320 0) scale(-1 1)">
                <Laurel />
              </g>
            </motion.svg>
            <div className="winner-core">
              <span className="winner-gold">GOLD</span>
              <motion.div className="winner-title" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 380, damping: 16 }}>
                {winners.length > 1 ? 'WINNERS' : 'WINNER'}
              </motion.div>
              <div className="winner-rule" />
              <div className="winner-avatars">
                {winners.map((w) => (
                  <img key={w.id} src={w.avatar || avatarsList[0]} alt="" />
                ))}
              </div>
              <div className="winner-name">{winners.map((w) => w.name).join(' & ')}</div>
              <div className="winner-meta">
                Round {results.round} · {top} pts
              </div>
            </div>
          </div>
          <div className="winner-standings">
            {standings.map((p, i) => (
              <div key={p.id} className="winner-row">
                <span className="winner-row-rank">{i + 1}</span>
                <img src={p.avatar || avatarsList[0]} alt="" />
                <span className="flex-1">{p.name}</span>
                <b>{results.scores[p.id] ?? 0}</b>
              </div>
            ))}
          </div>
          {isHost ? (
            <>
              <Pressable className="btn-primary w-full" onClick={onAgain}>
                {locked ? '🔒 Another round' : 'Another round'}
              </Pressable>
              {locked && <div className="winner-lock-note">Round 3 and up is part of I Betchu Won't</div>}
              <button type="button" className="guest-text onb-skip" onClick={onEnd}>
                End game
              </button>
            </>
          ) : (
            <div className="turn-wait">
              <span className="turn-wait-dot" />
              Waiting for the host
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
