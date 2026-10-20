import { useState } from 'react'
import { motion } from 'motion/react'
import { Modal, Pressable } from './ui'

type Perm = 'unknown' | 'granted' | 'blocked'

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 10l4.5-2.5v9L15 14" />
    <rect x="3" y="6" width="12" height="12" rx="2.5" />
  </svg>
)
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </svg>
)

export function PermissionsModal({ open, onDone, onSkip }: { open: boolean; onDone: () => void; onSkip: () => void }) {
  const [status, setStatus] = useState<Perm>('unknown')
  const [busy, setBusy] = useState(false)

  const ask = async () => {
    setBusy(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setStatus('granted')
      window.setTimeout(onDone, 900)
    } catch {
      setStatus('blocked')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} zIndex={2500} className="onb-modal">
      <div className="onb-hero" aria-hidden="true">
        <motion.div className={`onb-tile${status === 'granted' ? ' is-on' : ''}`} animate={status === 'granted' ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}>
          <CameraIcon />
        </motion.div>
        <motion.div className={`onb-tile${status === 'granted' ? ' is-on' : ''}`} animate={status === 'granted' ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4, delay: 0.1 }}>
          <MicIcon />
        </motion.div>
      </div>
      <h2 className="onb-title">Camera &amp; mic</h2>
      <p className="onb-sub">So you can be seen and heard in the party.</p>
      {status === 'granted' ? (
        <div className="onb-chips" role="status">
          <span className="onb-chip is-on">Camera &amp; mic ✓</span>
        </div>
      ) : status === 'blocked' ? (
        <div className="onb-blocked" role="status">
          <strong>Blocked.</strong> Allow camera &amp; mic for this site in your browser settings, then reload.
        </div>
      ) : null}
      {status !== 'granted' && (
        <Pressable className="btn-primary w-full onb-cta" onClick={() => void ask()} disabled={busy}>
          {busy ? 'Asking…' : status === 'blocked' ? 'Try again' : 'Allow camera & mic'}
        </Pressable>
      )}
      {status !== 'granted' && (
        <button type="button" className="guest-text onb-skip" onClick={onSkip}>
          Not now
        </button>
      )}
    </Modal>
  )
}

const SLIDES = [
  { art: '👉', title: 'Swipe to decide', text: 'Swipe the card right for I did it, left to Tap out. The orange stroke around the card is your timer.' },
  { art: '😈', title: 'Tap out = punishment', text: 'Chicken out and the deck hands you a punishment. Everyone waits until you press Done.' },
  { art: '🎥', title: 'Head to Head', text: 'Two phones face off on camera. Your rival sees you, you see them — first to tap out loses.' },
  { art: '🎙️', title: 'Hold to answer', text: 'On question cards, hold the mic and speak. Your words show up on every phone and in the Party Recap.' },
  { art: '🚨', title: 'Snitch & Proof', text: 'Call out a cheater with Snitch, or snap Proof when you pull a dare off. Both live at the bottom of the screen.' },
]

export function HowToPlayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)))
  const finish = () => {
    onClose()
    window.setTimeout(() => setI(0), 300)
  }
  const s = SLIDES[i]
  return (
    <Modal open={open} zIndex={2500} className="onb-modal">
      <div className="onb-kicker">HOW TO PLAY</div>
      <motion.div
        key={i}
        className="onb-slide"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(i + 1)
          else if (info.offset.x > 60) go(i - 1)
        }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="onb-art" aria-hidden="true">{s.art}</div>
        <h2 className="onb-title">{s.title}</h2>
        <p className="onb-sub">{s.text}</p>
      </motion.div>
      <div className="onb-dots" aria-hidden="true">
        {SLIDES.map((_, n) => (
          <button key={n} type="button" className={`onb-dot${n === i ? ' is-on' : ''}`} onClick={() => go(n)} tabIndex={-1} />
        ))}
      </div>
      <Pressable className="btn-primary w-full onb-cta" onClick={last ? finish : () => go(i + 1)}>
        {last ? "Let's play" : 'Next'}
      </Pressable>
      {!last && (
        <button type="button" className="guest-text onb-skip" onClick={finish}>
          Skip
        </button>
      )}
    </Modal>
  )
}
