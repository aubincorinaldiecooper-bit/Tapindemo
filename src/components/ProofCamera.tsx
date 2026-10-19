import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (dataUrl: string) => void
}

export function ProofCameraModal({ open, ...props }: Props) {
  return (
    <Modal open={open} zIndex={2500} className="max-w-[420px] bg-black border-2 border-orange-500/80 p-4">
      <CameraBody {...props} />
    </Modal>
  )
}

function CameraBody({ onClose, onSubmit }: Omit<Props, 'open'>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'denied'>('loading')
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [flashKey, setFlashKey] = useState(0)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startStream = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setStatus('live')
      })
      .catch(() => setStatus('denied'))
  }, [])

  useEffect(() => {
    startStream()
    return stopStream
  }, [startStream, stopStream])

  const snap = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 400
    canvas.height = video.videoHeight || 300
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshot(canvas.toDataURL('image/png'))
    setFlashKey((k) => k + 1)
    stopStream()
  }

  const retake = () => {
    setSnapshot(null)
    setStatus('loading')
    startStream()
  }

  const close = () => {
    stopStream()
    onClose()
  }

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-extrabold uppercase tracking-widest text-orange-400 flex items-center gap-1">📸 DARE PROOF CAMERA</div>
        <Pressable onClick={close} className="text-gray-400 font-bold text-lg">
          ✕
        </Pressable>
      </div>
      <p className="text-xs text-gray-300 mb-3">Snap proof or record your dare completion for the party story recap!</p>
      <div className="relative w-full h-[260px] bg-gray-900 rounded-2xl overflow-hidden border border-white/20 mb-3 flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${snapshot ? 'hidden' : ''}`} />
        {snapshot && (
          <motion.img
            src={snapshot}
            className="w-full h-full object-cover"
            initial={{ scale: 1.08, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
        {status !== 'live' && !snapshot && (
          <div className="absolute text-xs text-gray-400 font-bold">
            {status === 'denied' ? 'Camera access unavailable or denied.' : 'Camera Loading / Standby'}
          </div>
        )}
        <AnimatePresence>
          {flashKey > 0 && (
            <motion.div
              key={flashKey}
              className="absolute inset-0 bg-white pointer-events-none"
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="flex gap-2">
        {!snapshot ? (
          <Pressable onClick={snap} className="btn-primary w-full text-sm py-2.5">
            📸 Snap Photo Proof
          </Pressable>
        ) : (
          <Pressable onClick={retake} className="btn-store-gold w-full text-sm py-2.5">
            Retake
          </Pressable>
        )}
      </div>
      <AnimatePresence>
        {snapshot && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Pressable
              onClick={() => {
                onSubmit(snapshot)
                close()
              }}
              className="btn-complete-dare w-full text-sm py-2.5 mt-2"
            >
              Confirm &amp; Submit Proof 🚀
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
