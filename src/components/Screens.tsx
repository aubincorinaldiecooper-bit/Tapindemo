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
  onPlay: () => void
  onOpenStore: () => void
}

export function TitleScreen({ unlocked, onPlay, onOpenStore }: TitleProps) {
  return (
    <motion.div className="title-screen-container" {...fade} transition={{ duration: 0.3 }}>
      <div className="title-brand">
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
      </div>

      <div className="title-actions">
      <motion.button
        type="button"
        onClick={onOpenStore}
        className="w-full max-w-[340px] bg-[#1c1c21] border border-orange-500/40 rounded-2xl p-3 mb-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
        whileTap={{ scale: 0.97 }}
      >
        <motion.div
          key={unlocked ? 'unlocked' : 'locked'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={
            unlocked
              ? 'text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/40 inline-block px-3 py-0.5 rounded-full mb-1'
              : 'text-[10px] font-black uppercase tracking-widest text-orange-400/80 bg-orange-500/10 border border-orange-500/30 inline-block px-3 py-0.5 rounded-full mb-1'
          }
        >
          {unlocked ? '✅ UNLOCKED • READY TO PLAY' : '🔒 PREMIUM MODE • $0.99'}
        </motion.div>
        <div className="font-extrabold text-xl text-white tracking-tight">I BETCHU WON'T</div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Last Player Standing • 3 Lives • Strictly Dares</div>
      </motion.button>

      <motion.div
        className="w-full flex justify-center"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Pressable className="btn-primary" onClick={onPlay}>
          Play
        </Pressable>
      </motion.div>
      </div>
    </motion.div>
  )
}

interface LobbyProps {
  user: { name: string; avatar: string }
  onHost: () => void
  onJoin: () => void
  onOpenRecap: () => void
}

export function LobbyScreen({ user, onHost, onJoin, onOpenRecap }: LobbyProps) {
  return (
    <motion.div className="party-feed-container" {...fade} transition={{ duration: 0.3 }}>
      <h1 className="party-feed-header mb-6 text-center">Party Lobby</h1>

      <motion.div
        className="lobby-profile"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }}
      >
        <img src={user.avatar} alt="" className="lobby-profile-img" />
        <div className="lobby-profile-name">{user.name}</div>
        <div className="lobby-profile-sub">Ready to play</div>
      </motion.div>

      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <Pressable className="btn-primary w-full" onClick={onHost}>
          Host Room
        </Pressable>
        <Pressable className="btn-store-gold w-full" onClick={onJoin}>
          Join Room
        </Pressable>
      </div>

      <button type="button" onClick={onOpenRecap} className="guest-text">
        View Party Recap
      </button>
    </motion.div>
  )
}
