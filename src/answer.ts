import { useCallback, useEffect, useRef, useState } from 'react'

// Hold-to-talk recorder for spoken card answers. Captures the mic at whatever rate the device gives,
// downsamples to 16 kHz mono and packs a 16-bit WAV, which Phonon decodes natively on every browser
// (MediaRecorder's webm/mp4 containers are not accepted by its libsndfile input).
const TARGET_RATE = 16_000
export const MAX_ANSWER_SECONDS = 15

export type MicState = 'idle' | 'recording' | 'sending' | 'blocked'

const downsample = (chunks: Float32Array[], fromRate: number) => {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const input = new Float32Array(total)
  let o = 0
  for (const c of chunks) {
    input.set(c, o)
    o += c.length
  }
  if (fromRate === TARGET_RATE) return input
  const ratio = fromRate / TARGET_RATE
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out[i] = end > start ? sum / (end - start) : 0
  }
  return out
}

const toWav = (samples: Float32Array) => {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (off: number, s: string) => [...s].forEach((ch, i) => v.setUint8(off + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, TARGET_RATE, true)
  v.setUint32(28, TARGET_RATE * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

export const micSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined'

export function useAnswerRecorder(onReady: (wav: ArrayBuffer, cardId: number) => Promise<void>) {
  const [state, setState] = useState<MicState>('idle')
  const session = useRef<{ ctx: AudioContext; stream: MediaStream; node: ScriptProcessorNode; chunks: Float32Array[]; limit: number; cardId: number } | null>(null)
  // True between pointer-down and pointer-up. If the player lets go while the permission prompt is still up, don't start recording.
  const held = useRef(false)
  const holdToken = useRef(0)

  const stop = useCallback(async () => {
    held.current = false
    const s = session.current
    if (!s) return
    session.current = null
    window.clearTimeout(s.limit)
    s.node.disconnect()
    s.stream.getTracks().forEach((t) => t.stop())
    const rate = s.ctx.sampleRate
    await s.ctx.close()
    const samples = downsample(s.chunks, rate)
    if (samples.length < TARGET_RATE / 4) return setState('idle')
    setState('sending')
    try {
      await onReady(toWav(samples), s.cardId)
    } finally {
      setState('idle')
    }
  }, [onReady])

  const start = useCallback(async (cardId: number) => {
    if (session.current || held.current || !micSupported()) return
    held.current = true
    const token = ++holdToken.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      if (!held.current || holdToken.current !== token || session.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const node = ctx.createScriptProcessor(4096, 1, 1)
      const chunks: Float32Array[] = []
      node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
      src.connect(node)
      node.connect(ctx.destination)
      const limit = window.setTimeout(() => void stop(), MAX_ANSWER_SECONDS * 1000)
      session.current = { ctx, stream, node, chunks, limit, cardId }
      setState('recording')
    } catch {
      // A rejection from an older hold must not touch the hold that replaced it.
      if (holdToken.current !== token) return
      held.current = false
      setState('blocked')
      window.setTimeout(() => {
        if (holdToken.current === token) setState('idle')
      }, 2500)
    }
  }, [stop])

  useEffect(
    () => () => {
      const s = session.current
      if (!s) return
      session.current = null
      window.clearTimeout(s.limit)
      s.stream.getTracks().forEach((t) => t.stop())
      void s.ctx.close()
    },
    []
  )

  return { state, start, stop }
}
