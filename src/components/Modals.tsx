import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import type { Mode } from '../game'
import { AvatarPicker } from './AvatarPicker'
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

export function StoreModal({ open, onClose, onUnlock }: { open: boolean; onClose: () => void; onUnlock: () => void }) {
  return (
    <Modal open={open} className="max-w-[480px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="mb-0 text-amber-400">GAME MODES STORE</h2>
        <Pressable onClick={onClose} className="text-gray-400 font-bold text-xl px-2">
          ✕
        </Pressable>
      </div>
      <p className="text-xs text-gray-300 font-medium mb-4">Unlock extreme battle royale modes, verified reputation badges, and specialized party packs!</p>
      <div className="store-hero-betchu">
        <motion.div
          className="store-badge-red"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          $0.99 • POPULAR
        </motion.div>
        <h3 className="font-black text-2xl text-white tracking-wide uppercase">I BETCHU WON'T</h3>
        <div className="text-xs font-extrabold text-red-200 mb-2">SUBTITLE: LAST PLAYER STANDING</div>
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
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 text-left mb-3">Other Available Game Packs</div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left flex justify-between items-center">
          <div>
            <div className="font-extrabold text-sm text-amber-400">🎉 CLASSIC TAP IN</div>
            <div className="text-xs text-gray-300">Expanded deck with separate Shot O'Clock &amp; Wild cards, custom punishments, and spicy truths!</div>
          </div>
          <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-500/40">FREE</span>
        </div>
      </div>
      <button type="button" onClick={onClose} className="w-full text-gray-400 font-semibold text-sm py-2">
        Back to Lobby
      </button>
    </Modal>
  )
}

export function CheckoutModal({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} zIndex={2900} className="max-w-[420px] border-2 border-amber-500/80 bg-gradient-to-b from-gray-900 via-black to-black shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 border border-amber-500/40 inline-block px-3 py-1 rounded-full mb-2">
        IN-APP PURCHASE
      </div>
      <h2 className="text-3xl font-black text-white mb-1">UNLOCK "I BETCHU WON'T"</h2>
      <div className="text-4xl font-black text-amber-400 my-2">
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
  mode: Mode
  unlocked: boolean
  user: Player
  onAvatar: (url: string) => void
  onName: (name: string) => void
  onMode: (mode: Mode) => void
  onLockedBetchu: () => void
  onCancel: () => void
  onStart: () => void
  toast: (msg: string) => void
}

export function HostModal({ open, ...props }: HostProps) {
  return (
    <Modal open={open} className="max-w-[460px]">
      <HostBody {...props} />
    </Modal>
  )
}

function HostBody({ mode, unlocked, user, onAvatar, onName, onMode, onLockedBetchu, onCancel, onStart, toast }: Omit<HostProps, 'open'>) {
  const [code, setCode] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('Host')

  const generate = () => {
    const trimmed = nameInput.trim()
    if (trimmed) onName(trimmed)
    setCode(Math.floor(1000 + Math.random() * 9000).toString())
  }

  const copy = () => {
    if (!code) return
    navigator.clipboard?.writeText(code)
    toast('Room code copied: ' + code)
  }

  return (
    <>
      <h2>Host Party Room</h2>
      <AnimatePresence mode="wait" initial={false}>
        {!code ? (
          <motion.div key="setup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <input type="text" placeholder="Party Room Name (e.g., Friday Night Tap In)" maxLength={24} />
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 mb-4 text-left">
              <label className="text-xs font-extrabold text-orange-400 uppercase tracking-wider block mb-2">🎮 Choose Game Mode</label>
              <div className="flex flex-col gap-2">
                <motion.label
                  whileTap={{ scale: 0.98 }}
                  className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5 cursor-pointer hover:bg-white/10"
                >
                  <input type="radio" name="gameModeSelect" checked={mode === 'classic'} onChange={() => onMode('classic')} className="mt-1 accent-orange-500" />
                  <div>
                    <div className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>🎉 CLASSIC TAP IN</span>
                      <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black">FREE</span>
                    </div>
                    <div className="text-[11px] text-gray-300">Includes separate Shot O'Clock &amp; Wild cards + Custom Punishments!</div>
                  </div>
                </motion.label>
                <motion.label
                  whileTap={{ scale: 0.98 }}
                  className="flex items-start gap-3 bg-red-950/40 border border-red-500/50 rounded-xl p-2.5 cursor-pointer hover:bg-red-900/30"
                >
                  <input
                    type="radio"
                    name="gameModeSelect"
                    checked={mode === 'betchu'}
                    onChange={() => (unlocked ? onMode('betchu') : onLockedBetchu())}
                    className="mt-1 accent-red-500"
                  />
                  <div>
                    <div className="font-extrabold text-sm text-red-400 flex items-center gap-2">
                      <span>🔥 "I BETCHU WON'T"</span>
                      <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">$0.99</span>
                    </div>
                    <div className="text-[11px] text-gray-300">3 Lives • Strictly "I betchu won't" Dares • Elimination Battle.</div>
                  </div>
                </motion.label>
              </div>
            </div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Your Nickname</label>
            <input type="text" placeholder="Your Name" maxLength={16} value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Choose Profile Avatar</label>
            <AvatarPicker selected={user.avatar} onSelect={onAvatar} onUploaded={() => toast('📸 Profile photo updated!')} />
            <Pressable onClick={generate} className="btn-primary w-full text-base py-3">
              Create Room Code
            </Pressable>
          </motion.div>
        ) : (
          <motion.div key="lobby" className="w-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="text-xs font-bold uppercase tracking-widest text-orange-400 mt-2 mb-1">Room Code</div>
            <div className="code-display flex justify-center">
              {code.split('').map((d, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: -24, rotateX: 90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}
                >
                  {d}
                </motion.span>
              ))}
            </div>
            <Pressable
              onClick={copy}
              className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-500/30 px-4 py-2 rounded-lg mb-3"
            >
              Copy Code
            </Pressable>
            <div>
              <div
                className={
                  mode === 'betchu'
                    ? 'text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-500/30 px-3 py-1.5 rounded-full inline-block mb-3'
                    : 'text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-950/60 border border-orange-500/30 px-3 py-1.5 rounded-full inline-block mb-3'
                }
              >
                {mode === 'betchu' ? "Mode: 🔥 'I Betchu Won't' (3 Lives)" : 'Mode: Classic Tap In'}
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-300 mb-2">Players Joined:</div>
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto mb-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2.5"
              >
                <div className="flex items-center gap-2">
                  <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-orange-500" />
                  <span className="font-bold text-sm text-white">{user.name} (Host)</span>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/30">Ready</span>
              </motion.div>
            </div>
            <Pressable onClick={onStart} className="btn-primary w-full text-base py-3 mt-2">
              Start Game 🚀
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
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
  user: Player
  onAvatar: (url: string) => void
  onJoin: (name: string) => void
  onCancel: () => void
  toast: (msg: string) => void
}

export function JoinModal({ open, user, onAvatar, onJoin, onCancel, toast }: JoinProps) {
  const [digits, setDigits] = useState(['', '', '', ''])
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
    onJoin(nameInput.trim())
  }

  return (
    <Modal open={open}>
      <h2>Join Room</h2>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Enter 4-Digit Code</label>
      <motion.div className="code-input-group" animate={shake}>
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
            animate={d ? { scale: [1, 1.15, 1], borderColor: '#00ffff' } : { scale: 1, borderColor: 'rgba(255,255,255,0.2)' }}
            whileFocus={{ y: -2, boxShadow: '0 0 14px rgba(0,255,255,0.35)' }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </motion.div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Your Nickname</label>
      <input type="text" placeholder="Your Name" maxLength={16} value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block text-left mb-1">Choose Avatar</label>
      <AvatarPicker selected={user.avatar} onSelect={onAvatar} onUploaded={() => toast('📸 Profile photo updated!')} />
      <Pressable onClick={submit} className="btn-primary w-full text-base py-3">
        Join Room
      </Pressable>
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
    <Modal open={open} zIndex={2400} className="max-w-[440px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="mb-0 text-purple-400">PARTY RECAP</h2>
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
        Back to Game
      </Pressable>
    </Modal>
  )
}
