import { AnimatePresence, MotionConfig } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { avatarsList } from './data'
import type { Mode } from './game'
import { GameScreen, PunishmentOverlay } from './components/GameScreen'
import { CheckoutModal, HostModal, JoinModal, RecapModal, RoomLobbyModal, StoreModal, type Player, type ProofPhoto } from './components/Modals'
import { ProofCameraModal } from './components/ProofCamera'
import { LoadingScreen, LobbyScreen, TitleScreen } from './components/Screens'
import { Toast } from './components/ui'
import { roomFromUrl, savedParty, useDeadline, useRoom } from './net'
import { DEFAULT_TIMER, type TimerSeconds } from './protocol'

type Screen = 'title' | 'lobby' | 'game'
type ModalName = 'store' | 'checkout' | 'host' | 'join' | 'room' | 'proof' | 'recap' | null

export default function App() {
  const [loading, setLoading] = useState(true)
  const [inviteCode] = useState(() => roomFromUrl())
  // Arriving through a party link skips the title and opens Join with the code filled in.
  const [screen, setScreen] = useState<Screen>(() => (inviteCode || savedParty() ? 'lobby' : 'title'))
  const [modal, setModal] = useState<ModalName>(() => (inviteCode ? 'join' : null))
  const [checkoutFrom, setCheckoutFrom] = useState<ModalName>(null)
  const [mode, setMode] = useState<Mode>('classic')
  const [unlocked, setUnlocked] = useState(false)
  const [seconds, setSeconds] = useState<TimerSeconds>(DEFAULT_TIMER)
  const [user, setUser] = useState<Player>(() => {
    const saved = savedParty()
    return saved ? { name: saved.name, avatar: saved.avatar || avatarsList[0] } : { name: 'Player', avatar: avatarsList[0] }
  })
  const [photos, setPhotos] = useState<ProofPhoto[]>([])
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const toast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current)
    setToastMsg({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2500)
  }, [])

  const room = useRoom(
    (reason) => {
      toast(reason)
      setModal(null)
      setScreen('lobby')
    },
    // The server owns the game phase; mirror it into the screen as updates arrive.
    (st) => {
      if (st.phase === 'game') {
        setModal((m) => (m === 'room' || m === 'join' || m === 'host' ? null : m))
        setScreen('game')
      } else {
        setScreen('lobby')
        setModal('room')
      }
    },
  )
  const { state } = room
  const meId = room.me

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1800)
    return () => window.clearTimeout(t)
  }, [])

  const timeLeft = useDeadline(state?.deadline ?? null, !!state?.punishment)
  const isMyTurn = !!state && state.turnId === meId
  const turnPlayer = state?.players.find((p) => p.id === state.turnId)
  const punished = state?.punishment ? state.players.find((p) => p.id === state.punishment?.playerId) : undefined
  const isHost = !!state && state.hostId === meId

  const confirmPurchase = () => {
    setUnlocked(true)
    setMode('betchu')
    setModal(null)
    toast("🎉 'I Betchu Won't' Mode Unlocked Successfully!")
    setScreen('lobby')
  }

  const leaveGame = () => {
    if (!confirm('Leave this party and return to the Home Screen?')) return
    room.leaveRoom()
    setModal(null)
    setScreen('title')
  }

  const hostCreate = async (name: string) => {
    if (name) setUser((u) => ({ ...u, name }))
    const r = await room.createRoom(name || user.name, user.avatar, mode, seconds)
    if (!r.ok) toast(r.error)
  }

  const join = async (code: string, name: string) => {
    if (name) setUser((u) => ({ ...u, name }))
    const r = await room.joinRoom(code, name || user.name, user.avatar)
    if (!r.ok) toast(r.error)
    else if (inviteCode) window.history.replaceState(null, '', window.location.pathname)
  }

  return (
    <MotionConfig reducedMotion="user">
      <Toast message={toastMsg} />
      <AnimatePresence>{loading && <LoadingScreen key="loading" />}</AnimatePresence>

      <div style={{ display: 'contents' }} inert={modal !== null}>
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
        {screen === 'game' && state?.card && (
          <GameScreen
            key="game"
            mode={state.mode}
            card={state.card}
            timeLeft={timeLeft}
            user={user}
            isMyTurn={isMyTurn}
            turnName={turnPlayer?.name ?? 'Someone'}
            onHome={leaveGame}
            onComplete={() => {
              toast('✨ Action completed successfully!')
              room.verdict('complete')
            }}
            onSnitch={() => toast('🚨 Snitch Mode active! Challenge registered.')}
            onProof={() => setModal('proof')}
            onNext={() => {
              toast('⏭️ Passing to next player!')
              room.verdict('skip')
            }}
            onTapOut={() => room.verdict('tapout')}
          />
        )}
      </AnimatePresence>
      </div>

      <StoreModal open={modal === 'store' || (modal === 'checkout' && checkoutFrom === 'store')} inert={modal === 'checkout'} onClose={() => setModal(null)} onUnlock={() => { setCheckoutFrom('store'); setModal('checkout') }} />
      <CheckoutModal open={modal === 'checkout'} onCancel={() => setModal(checkoutFrom)} onConfirm={confirmPurchase} />
      <HostModal
        open={modal === 'host' || (modal === 'checkout' && checkoutFrom === 'host')}
        inert={modal === 'checkout'}
        mode={mode}
        unlocked={unlocked}
        user={user}
        onAvatar={(avatar) => setUser((u) => ({ ...u, avatar }))}
        onName={(name) => setUser((u) => ({ ...u, name }))}
        onMode={setMode}
        seconds={seconds}
        onSeconds={setSeconds}
        onLockedBetchu={() => { setCheckoutFrom('host'); setModal('checkout') }}
        onCancel={() => setModal(null)}
        onCreate={hostCreate}
        toast={toast}
      />
      <JoinModal
        open={modal === 'join'}
        initialCode={inviteCode}
        user={user}
        onAvatar={(avatar) => setUser((u) => ({ ...u, avatar }))}
        onJoin={join}
        onCancel={() => setModal(null)}
        toast={toast}
      />
      <RoomLobbyModal
        open={modal === 'room'}
        state={state}
        meId={meId ?? ''}
        onStart={room.startGame}
        onLeave={() => {
          room.leaveRoom()
          setModal(null)
        }}
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
        text={state?.punishment?.text ?? null}
        playerName={punished?.name ?? 'Someone'}
        canDismiss={!!state?.punishment && (state.punishment.playerId === meId || isHost)}
        onDone={room.punishmentDone}
      />
    </MotionConfig>
  )
}
