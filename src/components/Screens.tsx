import { motion } from 'motion/react'
import { Pressable } from './ui'

const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }

export function LoadingScreen() {
  return (
    <motion.div id="loadingScreen" {...fade} exit={{ opacity: 0, transition: { duration: 0.8 } }}>
      <div className="glass-container">
        <div className="liquid" />
      </div>
      <div className="loading-text">Pouring Tap In...</div>
    </motion.div>
  )
}

interface TitleProps {
  unlocked: boolean
  onPlayClassic: () => void
  onPlayBetchu: () => void
  onOpenStore: () => void
}

export function TitleScreen({ unlocked, onPlayClassic, onPlayBetchu, onOpenStore }: TitleProps) {
  return (
    <motion.div className="title-screen-container" {...fade} transition={{ duration: 0.3 }}>
      <motion.div
        className="title-main-text"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      >
        Tap In
      </motion.div>
      <motion.div className="title-sub-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        THE <span className="party-word">PARTY</span> APP
      </motion.div>

      <motion.div
        className="w-full max-w-[340px] bg-red-950/70 border-2 border-red-500/80 rounded-2xl p-3 mb-4 text-center shadow-xl backdrop-blur-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
      >
        <motion.div
          key={unlocked ? 'unlocked' : 'locked'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={
            unlocked
              ? 'text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 inline-block px-3 py-0.5 rounded-full mb-1'
              : 'text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-900/60 border border-amber-500/40 inline-block px-3 py-0.5 rounded-full mb-1'
          }
        >
          {unlocked ? '✅ UNLOCKED • READY TO PLAY' : '🔒 PREMIUM MODE • $0.99'}
        </motion.div>
        <div className="font-extrabold text-xl text-white tracking-tight">I BETCHU WON'T</div>
        <div className="text-xs font-bold text-red-200 uppercase tracking-wide">Last Player Standing • 3 Lives • Strictly Dares</div>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 w-full items-center"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } } }}
      >
        {[
          { label: '🎉 Play Classic Tap In', className: 'btn-primary', onClick: onPlayClassic },
          { label: '🔥 Play "I Betchu Won\'t"', className: 'btn-betchu-mode', onClick: onPlayBetchu },
          { label: '🛒 Game Modes Store', className: 'btn-store-gold', onClick: onOpenStore },
        ].map((b) => (
          <motion.div key={b.label} className="w-full flex justify-center" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
            <Pressable className={b.className} onClick={b.onClick}>
              {b.label}
            </Pressable>
          </motion.div>
        ))}
      </motion.div>

      <div className="guest-text" onClick={onPlayClassic}>
        Play as Guest
      </div>
    </motion.div>
  )
}

interface LobbyProps {
  onOpenRecap: () => void
  onOpenStore: () => void
  onHostClassic: () => void
  onHostBetchu: () => void
  onJoin: () => void
}

export function LobbyScreen({ onOpenRecap, onOpenStore, onHostClassic, onHostBetchu, onJoin }: LobbyProps) {
  return (
    <motion.div className="party-feed-container" {...fade} transition={{ duration: 0.3 }}>
      <div className="w-full max-w-[440px] flex justify-between items-center mb-2">
        <h1 className="party-feed-header mb-0">Party Lobby</h1>
        <div className="flex items-center gap-2">
          <Pressable
            onClick={onOpenRecap}
            className="bg-purple-600/30 text-purple-300 border border-purple-500/40 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"
          >
            📸 Recap
          </Pressable>
          <Pressable
            onClick={onOpenStore}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"
          >
            🛒 Store
          </Pressable>
        </div>
      </div>

      <div className="party-list">
        <motion.div
          className="bg-black/50 border border-white/10 rounded-2xl p-4 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-gray-300 font-bold text-base mb-1">Choose your party mode below!</p>
          <p className="text-xs text-gray-400">Classic Casual Truth/Dares with separate Shot O'Clock &amp; Wildcards, plus Punishments</p>
        </motion.div>
      </div>

      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <Pressable className="btn-primary w-full" onClick={onHostClassic}>
          🎉 Host Classic Tap In
        </Pressable>
        <Pressable className="btn-betchu-mode w-full" onClick={onHostBetchu}>
          🔥 Host "I Betchu Won't"
        </Pressable>
        <Pressable className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #4b5563, #1f2937)' }} onClick={onJoin}>
          Join Room Code
        </Pressable>
      </div>
    </motion.div>
  )
}
