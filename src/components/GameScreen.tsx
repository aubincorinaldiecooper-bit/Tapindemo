import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'
import type { DrawnCard, Mode } from '../game'
import type { Player } from './Modals'
import { Pressable } from './ui'

interface Props {
  mode: Mode
  card: DrawnCard
  timeLeft: number
  user: Player
  onHome: () => void
  onComplete: () => void
  onSnitch: () => void
  onProof: () => void
  onNext: () => void
  onTapOut: () => void
}

export function GameScreen({ mode, card, timeLeft, user, onHome, onComplete, onSnitch, onProof, onNext, onTapOut }: Props) {
  const dragged = useRef(false)
  const isBetchu = mode === 'betchu'
  const isWildcard = card.kind === 'wildcard'
  const isShotOClock = card.kind === 'shotoclock'
  const urgent = timeLeft <= 10

  const cardClasses = [
    isBetchu && 'betchu-active-card',
    isWildcard && 'wildcard-active-card',
    isShotOClock && 'shotoclock-active-card',
    card.isIcebreaker && 'icebreaker-active-card',
  ]
    .filter(Boolean)
    .join(' ')

  const badge = isBetchu ? "I BETCHU WON'T EDITION" : isShotOClock ? "SHOT O'CLOCK CARD" : isWildcard ? 'WILDCARD' : 'ROUND ' + (card.index + 1)

  return (
    <motion.div
      className="absolute inset-0 z-[1100] bg-[#08080c] flex justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={`game-container ${cardClasses}`}>
        <div className="game-top-bar">
          <Pressable className="icon-nav-btn exit-btn" title="Exit game" aria-label="Exit game" onClick={onHome}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </Pressable>
          <div className="player-header-pill">
            <img src={user.avatar} className="profile-avatar" />
            <div className="flex flex-col text-left">
              <span className="profile-name">{user.name}</span>
            </div>
          </div>
          {isBetchu && (
            <div className="lives-meter-box">
              <span className="heart-icon">❤️</span>
              <span className="heart-icon">❤️</span>
              <span className="heart-icon">❤️</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            className={`main-game-card ${cardClasses}`}
            initial={{ opacity: 0, x: 80, rotate: 6, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, rotate: -6, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragStart={() => {
              dragged.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 110) onComplete()
              else if (info.offset.x < -110) onTapOut()
              setTimeout(() => {
                dragged.current = false
              }, 0)
            }}
            onClickCapture={(e) => {
              if (dragged.current) {
                e.stopPropagation()
                e.preventDefault()
              }
            }}
          >
            <div className="card-top-info">
              <span className="turn-badge turn-active-badge">🎲 {badge}</span>
              <motion.div
                className="timer-section"
                animate={urgent ? { scale: [1, 1.12, 1], color: '#f87171' } : { scale: 1 }}
                transition={urgent ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
              >
                <span>⏱️</span>{' '}
                <motion.span key={timeLeft} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
                  {timeLeft}
                </motion.span>
                s
              </motion.div>
            </div>

            <div className="flex flex-col items-center justify-center my-auto w-full px-2">
              {card.isIcebreaker && <div className="icebreaker-icon-glow">🧊</div>}
              <motion.span
                className={`spice-tag ${card.spiceClass}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 500, damping: 16 }}
              >
                {card.spiceLabel}
              </motion.span>
              {isBetchu && <div className="betchu-dare-callout">I BETCHU WON'T...</div>}
              {isShotOClock && (
                <motion.div className="shotoclock-callout" animate={{ rotate: [0, -4, 4, -2, 0] }} transition={{ delay: 0.3, duration: 0.5 }}>
                  SHOT O'CLOCK! ⏰
                </motion.div>
              )}
              {isWildcard && (
                <motion.div className="wildcard-callout" initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  WILDCARD! ✨
                </motion.div>
              )}
              <motion.div className="dare-box" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                "{card.text}"
              </motion.div>
            </div>

            <div className="verdict-row">
              <Pressable className="btn-tapout-big verdict-decline" onClick={onTapOut}>
                Tap out{isBetchu ? ' (−1 ❤️)' : ''}
              </Pressable>
              <Pressable className="btn-complete-dare verdict-accept" onClick={onComplete}>
                I did it
              </Pressable>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="actions-secondary-row mb-2">
          <Pressable className="action-chip-btn" onClick={onSnitch}>
            <span>🚨</span> Snitch
          </Pressable>
          <Pressable className="action-chip-btn" onClick={onProof}>
            <span>📸</span> Proof
          </Pressable>
          <Pressable className="action-chip-btn" onClick={onNext}>
            <span>⏭️</span> Skip
          </Pressable>
        </div>
      </div>
    </motion.div>
  )
}

export function PunishmentOverlay({ text, onDone }: { text: string | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          className="overlay-screen punishment-overlay"
          onClick={onDone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="punishment-title"
            initial={{ scale: 2.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: [0, -12, 12, -8, 8, 0] }}
            transition={{ scale: { type: 'spring', stiffness: 400, damping: 14 }, x: { delay: 0.2, duration: 0.4 } }}
          >
            TAP OUT!
          </motion.div>
          <motion.div className="punishment-text" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {text}
          </motion.div>
          <motion.div
            className="done-button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.92 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 400, damping: 18 }}
          >
            Done
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
