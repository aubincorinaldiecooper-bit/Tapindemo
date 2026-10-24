"use client"

import { useEffect, useImperativeHandle, useRef, useState } from "react"
import type { Ref } from "react"
import { animate, motion } from "motion/react"
import "./motion-confetti-utils/index.css"

const colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
const shapes = ["circle", "rect", "rect", "strip", "strip"] as const
const keyframeCount = 40
const popWindow = 0.08

type ParticleShape = (typeof shapes)[number]

type Particle = {
  keyframes: { transform: string[]; opacity: number[] }
  duration: number
  size: number
  color: string
  shape: ParticleShape
}

type Burst = {
  id: number
  particles: Particle[]
}

function buildKeyframes({
  angle,
  startVelocity,
  decay,
  gravity,
  drift,
  wobbleSpeed,
  wobbleOffset,
  size,
  ticks,
  tiltRotations,
  rotation,
}: {
  angle: number
  startVelocity: number
  decay: number
  gravity: number
  drift: number
  wobbleSpeed: number
  wobbleOffset: number
  size: number
  ticks: number
  tiltRotations: number
  rotation: number
}) {
  const transforms: string[] = []
  const opacities: number[] = []
  let velocity = startVelocity
  let x = 0
  let y = 0
  let wobble = wobbleOffset
  let tick = 0

  for (let i = 0; i <= keyframeCount; i++) {
    const t = i / keyframeCount
    if (i > 0) {
      const targetTick = Math.round((i * ticks) / keyframeCount)
      while (tick < targetTick) {
        x += Math.cos(angle) * velocity + drift
        y += Math.sin(angle) * velocity + gravity * 3
        velocity *= decay
        wobble += wobbleSpeed
        tick++
      }
    }
    const translateX = i === 0 ? 0 : x + Math.cos(wobble) * 15 * size
    const translateY = y
    let scale: number
    if (t < popWindow * 0.6) scale = (t / (popWindow * 0.6)) * 1.15
    else if (t < popWindow) scale = 1.15 - ((t - popWindow * 0.6) / (popWindow * 0.4)) * 0.15
    else scale = 1
    const tilt = tiltRotations * 360 * t
    let opacity: number
    if (t <= 0.5) opacity = 1
    else if (t <= 0.8) opacity = 1 - ((t - 0.5) / 0.3) * 0.5
    else opacity = 0.5 - ((t - 0.8) / 0.2) * 0.5
    transforms.push(
      `translate(${translateX}px, ${translateY}px) scale(${scale}) rotateY(${tilt}deg) rotate(${rotation}deg)`,
    )
    opacities.push(opacity)
  }

  return { transform: transforms, opacity: opacities }
}

function ParticleDot({ particle }: { particle: Particle }) {
  const ref = useRef<HTMLDivElement>(null)
  const { keyframes, duration, size, color, shape } = particle
  const width = shape === "strip" ? size * 0.3 : shape === "rect" ? size * 0.7 : size
  const height = shape === "strip" ? size * 2 : size
  const radius = shape === "circle" ? "50%" : shape === "strip" ? size * 0.12 : 2

  useEffect(() => {
    if (!ref.current) return
    const playback = animate(ref.current, keyframes, { duration, ease: "linear" })
    return () => playback.cancel()
  }, [keyframes, duration])

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        width,
        height,
        borderRadius: radius,
        backgroundColor: color,
        willChange: "transform, opacity",
        pointerEvents: "none",
      }}
    />
  )
}

function PartyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    </svg>
  )
}

export function Confetti({
  particleCount = 60,
  startVelocity = 25,
  spread = 100,
  decay = 0.91,
  gravity = 1,
  drift = 0,
  duration = 2.5,
  size = 1,
  buttonSpring = { stiffness: 400, damping: 15 },
  trigger = true,
  ref,
}: {
  particleCount?: number
  startVelocity?: number
  spread?: number
  decay?: number
  gravity?: number
  drift?: number
  duration?: number
  size?: number
  buttonSpring?: { stiffness: number; damping: number }
  /** Tile Rush: show the built-in Celebrate button. Turn off to fire only through `ref`. */
  trigger?: boolean
  /** Tile Rush: `ref.current.fire()` starts a burst (React 19 passes ref as a prop). */
  ref?: Ref<{ fire: () => void }>
} = {}) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const nextId = useRef(0)

  const fire = () => {
    const id = nextId.current++
    const ticks = Math.round(duration * 60)
    const particles = Array.from({ length: particleCount }, () => {
      const spreadRad = spread * (Math.PI / 180)
      const angle = -Math.PI / 2 + (0.5 * spreadRad - Math.random() * spreadRad)
      const velocity = startVelocity * 0.5 + Math.random() * startVelocity
      return {
        keyframes: buildKeyframes({
          angle,
          startVelocity: velocity,
          decay,
          gravity,
          drift,
          wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
          wobbleOffset: Math.random() * 10,
          size,
          ticks,
          tiltRotations: 2 + Math.random() * 4,
          rotation: Math.random() * 360,
        }),
        duration,
        size: 6 * size + Math.random() * 6 * size,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        shape: shapes[Math.floor(Math.random() * shapes.length)]!,
      }
    })
    setBursts((current) => [...current, { id, particles }])
    setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id))
    }, (duration + 0.5) * 1000)
  }

  useImperativeHandle(ref, () => ({ fire }))

  return (
    <div className="confetti-stage">
      <div className="confetti-root">
        {bursts.map((burst) => (
          <div key={burst.id} className="confetti-burst">
            {burst.particles.map((particle, index) => (
              <ParticleDot key={index} particle={particle} />
            ))}
          </div>
        ))}
        {trigger && (
          <motion.button
            className="confetti-trigger"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", ...buttonSpring }}
            onClick={fire}
          >
            <PartyIcon />
            <span>Celebrate</span>
          </motion.button>
        )}
      </div>
    </div>
  )
}

export default Confetti
