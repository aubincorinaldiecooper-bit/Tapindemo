import { motion, useAnimationControls } from 'motion/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { Mode } from '../game'
import { AvatarPicker } from './AvatarPicker'
import { avatarsList } from '../data'
import { shareLinkFor } from '../net'
import { TIMER_OPTIONS, type RoomState, type TimerSeconds } from '../protocol'
import { Modal, Pressable } from './ui'

export interface Player {
  name: string
  avatar: string
}

export interface ProofPhoto {
  url: string
  player: string
  time: string
}

export function StoreModal({ open, inert, onClose, onUnlock }: { open: boolean; inert?: boolean; onClose: () => void; onUnlock: () => void }) {
  return (
    <Modal open={open} inert={inert}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="mb-0 text-white">GAME MODES STORE</h2>
        <Pressable onClick={onClose} className="text-gray-400 font-bold text-xl px-2">
          ✕
        </Pressable>
      </div>
      <p className="text-xs text-gray-300 font-medium mb-4">Unlock extreme battle royale modes, verified reputation badges, and specialized party packs!</p>
      <div className="store-cols">
      <div className="store-hero-betchu">
        <motion.div
          className="store-badge-red"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          $0.99 • POPULAR
        </motion.div>
        <h3 className="font-black text-2xl text-white tracking-wide uppercase">I BETCHU WON'T</h3>
        <div className="text-xs font-extrabold text-gray-400 mb-2">LAST PLAYER STANDING</div>
        <p className="text-xs text-gray-100 mb-3 font-medium leading-relaxed">
          Battle Royale Dare Elimination! Everyone starts with 3 lives ❤️❤️❤️. Every card strictly says "I betchu won't" followed by an intense dare!
          Completing it keeps you alive. Tapping out loses a life 💔.
        </p>
        <div className="flex gap-2 items-center">
          <Pressable onClick={onUnlock} className="btn-betchu-mode text-xs py-2.5 w-full uppercase font-black">
            💳 UNLOCK MODE FOR $0.99
          </Pressable>
        </div>
      </div>
      <div className="store-other">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 text-left mb-3">Other Available Game Packs</div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left flex justify-between items-center">
          <div>
            <div className="font-extrabold text-sm text-white">🎉 CLASSIC TAP IN</div>
            <div className="text-xs text-gray-300">Expanded deck with separate Shot O'Clock &amp; Wild cards, custom punishments, and spicy truths!</div>
          </div>
          <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">FREE</span>
        </div>
      </div>
      </div>
      </div>
      <button type="button" onClick={onClose} className="w-full text-gray-400 font-semibold text-sm py-2">
        Close
      </button>
    </Modal>
  )
}

export function CheckoutModal({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} zIndex={2900} className="max-w-[420px] border border-orange-500/40">
      <div className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/30 inline-block px-3 py-1 rounded-full mb-2">
        IN-APP PURCHASE
      </div>
      <h2 className="text-3xl font-black text-white mb-1">UNLOCK "I BETCHU WON'T"</h2>
      <div className="text-4xl font-black text-orange-400 my-2">
        $0.99 <span className="text-xs text-gray-400 font-normal">one-time unlock</span>
      </div>
      <p className="text-xs text-gray-300 mb-4 leading-relaxed">
        Get lifetime access to the intense Battle Royale Dare Elimination mode, 3-lives system, Strictly Dare "I betchu won't" deck, Verified Reputation
        badges, and Dare Proof Camera!
      </p>
      <div className="flex flex-col gap-2">
        <Pressable onClick={onConfirm} className="btn-store-gold w-full text-base py-3 flex items-center justify-center gap-2">
          <span>💳 Pay $0.99 to Unlock</span>
        </Pressable>
        <button type="button" onClick={onCancel} className="w-full text-gray-400 font-semibold text-sm py-2">
          Cancel
        </button>
      </div>
    </Modal>
  )
}

interface HostProps {
  open: boolean
  inert?: boolean
  mode: Mode
  unlocked: boolean
  user: Player
  onAvatar: (url: string) => void
  onName: (name: string) => void
  onMode: (mode: Mode) => void
  seconds: TimerSeconds
  onSeconds: (s: TimerSeconds) => void
  onLockedBetchu: () => void
  onCancel: () => void
  onCreate: (name: string) => void
  toast: (msg: string) => void
}

export function HostModal({ open, inert, ...props }: HostProps) {
  return (
    <Modal open={open} inert={inert}>
      <HostBody {...props} />
    </Modal>
  )
}

function HostBody({ mode, unlocked, user, onAvatar, onMode, seconds, onSeconds, onLockedBetchu, onCancel, onCreate, toast }: Omit<HostProps, 'open' | 'inert' | 'onName'>) {
  const [nameInput, setNameInput] = useState('Host')

  return (
    <>
      <h2>Host Party Room</h2>
      <div className="form-cols">
            <div className="form-col form-col-profile">
            <AvatarPicker selected={user.avatar} onSelect={onAvatar} onUploaded={() => toast('📸 Profile photo updated!')} onError={() => toast("Couldn't read that photo — try another")} />
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Your Nickname</label>
            <input type="text" placeholder="Your Name" maxLength={16} value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            </div>
            <div className="form-col">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1 form-desktop-label">Party Room Name</label>
            <input type="text" placeholder="Party Room Name (e.g., Friday Night Tap In)" maxLength={24} />
            <div className="mode-toggle">
              {(['classic', 'betchu'] as const).map((m) => (
                <motion.button
                  key={m}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  className={`mode-toggle-option ${mode === m ? 'mode-toggle-active' : ''}`}
                  onClick={() => (m === 'betchu' && !unlocked ? onLockedBetchu() : onMode(m))}
                >
                  {m === 'classic' ? '🎉 Classic' : '🔥 Betchu Won’t'}
                </motion.button>
              ))}
            </div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1 mt-4">Seconds per card</label>
            <div className="mode-toggle timer-toggle">
              {TIMER_OPTIONS.map((t) => (
                <motion.button key={t} type="button" whileTap={{ scale: 0.96 }} className={`mode-toggle-option ${seconds === t ? 'mode-toggle-active' : ''}`} onClick={() => onSeconds(t)}>
                  {t}s
                </motion.button>
              ))}
            </div>
            <Pressable onClick={() => onCreate(nameInput.trim())} className="btn-primary w-full text-base py-3">
              Create Party Link
            </Pressable>
            </div>
            </div>
      <div className="flex flex-col gap-2 mt-2">
        <button type="button" onClick={onCancel} className="w-full text-gray-400 font-semibold text-sm py-2">
          Cancel
        </button>
      </div>
    </>
  )
}

interface JoinProps {
  open: boolean
  initialCode: string | null
  user: Player
  onAvatar: (url: string) => void
  onJoin: (code: string, name: string) => void
  onCancel: () => void
  toast: (msg: string) => void
}

export function JoinModal({ open, initialCode, user, onAvatar, onJoin, onCancel, toast }: JoinProps) {
  const [digits, setDigits] = useState(() => (initialCode ? initialCode.split('') : ['', '', '', '']))
  const [nameInput, setNameInput] = useState('Player')
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const shake = useAnimationControls()

  const setDigit = (i: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => prev.map((d, idx) => (idx === i ? v : d)))
    if (v && i < 3) inputs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const submit = () => {
    if (digits.join('').length < 4) {
      toast('Please enter the 4-digit code')
      shake.start({ x: [0, -10, 10, -8, 8, -4, 4, 0], transition: { duration: 0.45 } })
      return
    }
    onJoin(digits.join(''), nameInput.trim())
  }

  return (
    <Modal open={open}>
      <h2>Join Room</h2>
      <div className="form-cols">
      <div className="form-col form-col-profile">
      <AvatarPicker selected={user.avatar} onSelect={onAvatar} onUploaded={() => toast('📸 Profile photo updated!')} onError={() => toast("Couldn't read that photo — try another")} />
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Your Nickname</label>
      <input type="text" placeholder="Your Name" maxLength={16} value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
      </div>
      <div className="form-col">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">{initialCode ? 'Party' : 'Enter 4-Digit Pin'}</label>
      {initialCode && <div className="join-invite">You're invited to party <b>{initialCode}</b></div>}
      <motion.div className={`code-input-group mb-4 ${initialCode ? 'hidden' : ''}`} animate={shake}>
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            type="tel"
            className="code-input"
            maxLength={1}
            autoComplete="off"
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            animate={d ? { scale: [1, 1.15, 1], borderColor: '#f97316' } : { scale: 1, borderColor: 'rgba(255,255,255,0.12)' }}
            whileFocus={{ y: -2, borderColor: '#f97316' }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </motion.div>
      <Pressable onClick={submit} className="btn-primary w-full text-base py-3">
        Join Room
      </Pressable>
      </div>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <button type="button" onClick={onCancel} className="w-full text-gray-400 font-semibold text-sm py-2">
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export function RecapModal({ open, photos, onClose }: { open: boolean; photos: ProofPhoto[]; onClose: () => void }) {
  return (
    <Modal open={open} zIndex={2400}>
      <div className="flex justify-between items-center mb-3">
        <h2 className="mb-0 text-white">PARTY RECAP</h2>
        <Pressable onClick={onClose} className="text-gray-400 font-bold text-xl">
          ✕
        </Pressable>
      </div>
      <p className="text-xs text-gray-300 mb-3">Highlights, dare proofs, and legendary moments from tonight's session.</p>
      <motion.div
        className="recap-grid mb-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {photos.length === 0 ? (
          <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl h-[120px] flex items-center justify-center text-xs text-gray-400">
            No proofs snapped yet!
          </div>
        ) : (
          photos.map((p, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, scale: 0.85, y: 10 }, show: { opacity: 1, scale: 1, y: 0 } }}
              whileHover={{ scale: 1.03 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden relative flex flex-col"
            >
              <img src={p.url} className="w-full h-[100px] object-cover" />
              <div className="p-1.5 text-[10px] text-gray-300 font-bold flex justify-between bg-black/60">
                <span>{p.player}</span>
                <span>{p.time}</span>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
      <Pressable onClick={onClose} className="w-full btn-primary text-sm py-2.5">
        Close
      </Pressable>
    </Modal>
  )
}

interface RoomLobbyProps {
  open: boolean
  state: RoomState | null
  meId: string
  onStart: () => void
  onLeave: () => void
  toast: (msg: string) => void
}

export function RoomLobbyModal({ open, state, meId, onStart, onLeave, toast }: RoomLobbyProps) {
  const isHost = !!state && state.hostId === meId
  const share = async () => {
    if (!state) return
    const url = shareLinkFor(state.code)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tap In', text: 'Join my Tap In party', url })
        return
      } catch {
        /* user dismissed the share sheet */
      }
    }
    await navigator.clipboard?.writeText(url)
    toast('Party link copied')
  }
  return (
    <Modal open={open && !!state}>
      {state && (
        <>
          <h2>{isHost ? 'Your Party' : 'Party Lobby'}</h2>
          <div className="text-xs font-bold uppercase tracking-widest text-orange-400 mt-2 mb-1">Party Code</div>
          <div className="code-display flex justify-center">
            {state.code.split('').map((d, i) => (
              <motion.span key={i} initial={{ opacity: 0, y: -24, rotateX: 90 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}>
                {d}
              </motion.span>
            ))}
          </div>
          <Pressable onClick={share} className="btn-secondary w-full text-sm py-2.5 mb-3">
            Share party link
          </Pressable>
          <div className="text-xs font-semibold text-gray-300 mb-2">
            {state.players.length} {state.players.length === 1 ? 'player' : 'players'} · {state.mode === 'betchu' ? "🔥 I Betchu Won't" : '🎉 Classic'} · {state.cardSeconds}s cards
          </div>
          <div className="flex flex-col gap-2 mb-3 player-list">
            {state.players.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <img src={p.avatar || avatarsList[0]} className="w-8 h-8 rounded-full object-cover border border-orange-500" />
                  <span className="font-bold text-sm text-white">
                    {p.name}
                    {p.id === state.hostId ? ' (Host)' : ''}
                    {p.id === meId ? ' · you' : ''}
                  </span>
                </div>
                <span className={p.connected ? 'text-xs font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30' : 'text-xs font-black text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10'}>
                  {p.connected ? 'Ready' : 'Away'}
                </span>
              </motion.div>
            ))}
          </div>
          {isHost ? (
            <Pressable onClick={onStart} className="btn-primary w-full text-base py-3 mt-2">
              Start Game 🚀
            </Pressable>
          ) : (
            <div className="turn-wait mt-2">
              <span className="turn-wait-dot" />
              Waiting for the host to start
            </div>
          )}
          <div className="flex flex-col gap-2 mt-2">
            <button type="button" onClick={onLeave} className="w-full text-gray-400 font-semibold text-sm py-2">
              Leave party
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
