import { AnimatePresence, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { avatarsList, classicPunishmentsList } from './data'
import { drawCard, type DrawnCard, type Mode } from './game'
import { GameScreen, PunishmentOverlay } from './components/GameScreen'
import { CheckoutModal, HostModal, JoinModal, RecapModal, StoreModal, type Player, type ProofPhoto } from './components/Modals'
import { ProofCameraModal } from './components/ProofCamera'
import { LoadingScreen, LobbyScreen, TitleScreen } from './components/Screens'
import { Toast } from './components/ui'

type Screen = 'title' | 'lobby' | 'game'
type ModalName = 'store' | 'checkout' | 'host' | 'join' | 'proof' | 'recap' | null

const CARD_SECONDS = 60

export default function App() {
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<Screen>('title')
  const [modal, setModal] = useState<ModalName>(null)
  const [checkoutFrom, setCheckoutFrom] = useState<ModalName>(null)
  const [mode, setMode] = useState<Mode>('classic')
  const [unlocked, setUnlocked] = useState(false)
  const [user, setUser] = useState<Player>({ name: 'Player', avatar: avatarsList[0] })
  const [card, setCard] = useState<DrawnCard | null>(null)
  const [timeLeft, setTimeLeft] = useState(CARD_SECONDS)
  const [punishment, setPunishment] = useState<string | null>(null)
  const [photos, setPhotos] = useState<ProofPhoto[]>([])
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1800)
    return () => window.clearTimeout(t)
  }, [])

  const toast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToastMsg({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2500)
  }, [])

  const tapOut = useCallback(() => {
    setPunishment(classicPunishmentsList[Math.floor(Math.random() * classicPunishmentsList.length)])
  }, [])

  // Timer pauses while the punishment overlay is up, like the original.
  useEffect(() => {
    if (screen !== 'game' || !card || punishment || timeLeft <= 0) return
    const t = window.setTimeout(() => {
      setTimeLeft(timeLeft - 1)
      if (timeLeft - 1 <= 0) tapOut()
    }, 1000)
    return () => window.clearTimeout(t)
  }, [screen, card, punishment, timeLeft, tapOut])

  const advance = () => {
    setCard(drawCard(mode))
    setTimeLeft(CARD_SECONDS)
  }

  const startGame = () => {
    setModal(null)
    setCard(drawCard(mode, true))
    setTimeLeft(CARD_SECONDS)
    setScreen('game')
  }

  const confirmPurchase = () => {
    setUnlocked(true)
    setMode('betchu')
    setModal(null)
    toast("🎉 'I Betchu Won't' Mode Unlocked Successfully!")
    setScreen('lobby')
  }

  const goHome = () => {
    if (!confirm('End current party session and return to Home Screen?')) return
    setScreen('title')
    setCard(null)
  }

  return (
    <MotionConfig reducedMotion="user">
      <Toast message={toastMsg} />
      <AnimatePresence>{loading && <LoadingScreen key="loading" />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === 'title' && (
          <TitleScreen
            key="title"
            unlocked={unlocked}
            onPlay={() => setScreen('lobby')}
            onOpenStore={() => setModal('store')}
          />
        )}
        {screen === 'lobby' && (
          <LobbyScreen
            key="lobby"
            user={user}
            onOpenRecap={() => setModal('recap')}
            onHost={() => {
              setMode('classic')
              setModal('host')
            }}
            onJoin={() => setModal('join')}
          />
        )}
        {screen === 'game' && card && (
          <GameScreen
            key="game"
            mode={mode}
            card={card}
            timeLeft={timeLeft}
            user={user}
            onHome={goHome}
            onComplete={() => {
              toast('✨ Action completed successfully!')
              advance()
            }}
            onSnitch={() => toast('🚨 Snitch Mode active! Challenge registered.')}
            onProof={() => setModal('proof')}
            onNext={() => {
              toast('⏭️ Passing to next player!')
              advance()
            }}
            onTapOut={tapOut}
          />
        )}
      </AnimatePresence>

      <StoreModal open={modal === 'store'} onClose={() => setModal(null)} onUnlock={() => { setCheckoutFrom('store'); setModal('checkout') }} />
      <CheckoutModal open={modal === 'checkout'} onCancel={() => setModal(checkoutFrom)} onConfirm={confirmPurchase} />
      <HostModal
        open={modal === 'host'}
        mode={mode}
        unlocked={unlocked}
        user={user}
        onAvatar={(avatar) => setUser((u) => ({ ...u, avatar }))}
        onName={(name) => setUser((u) => ({ ...u, name }))}
        onMode={setMode}
        onLockedBetchu={() => { setCheckoutFrom('host'); setModal('checkout') }}
        onCancel={() => setModal(null)}
        onStart={startGame}
        toast={toast}
      />
      <JoinModal
        open={modal === 'join'}
        user={user}
        onAvatar={(avatar) => setUser((u) => ({ ...u, avatar }))}
        onJoin={(name) => {
          if (name) setUser((u) => ({ ...u, name }))
          startGame()
        }}
        onCancel={() => setModal(null)}
        toast={toast}
      />
      <ProofCameraModal
        open={modal === 'proof'}
        onClose={() => setModal(null)}
        onSubmit={(url) => {
          setPhotos((p) => [...p, { url, player: user.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
          toast('📸 Dare proof added to Party Recap!')
        }}
      />
      <RecapModal open={modal === 'recap'} photos={photos} onClose={() => setModal(null)} />
      <PunishmentOverlay
        text={punishment}
        onDone={() => {
          setPunishment(null)
          advance()
        }}
      />
    </MotionConfig>
  )
}
