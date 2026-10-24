import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

const pressSpring = { type: 'spring', stiffness: 500, damping: 28 } as const

export function Pressable({ className = '', ...props }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ y: 1, scale: 0.95 }}
      transition={pressSpring}
      className={`motion-press ${className}`}
      {...props}
    />
  )
}

interface ModalProps {
  open: boolean
  children: ReactNode
  className?: string
  zIndex?: number
  inert?: boolean
}

export function Modal({ open, children, className = '', zIndex, inert }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          style={{ zIndex }}
          inert={inert}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={`modal-content ${className}`}
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toast({ message }: { message: { id: number; text: string } | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message.id}
          className="toast"
          initial={{ opacity: 0, x: '-50%', y: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          {message.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
