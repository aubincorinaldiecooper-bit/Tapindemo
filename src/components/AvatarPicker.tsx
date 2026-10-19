import { motion } from 'motion/react'
import { useRef, type ChangeEvent } from 'react'

interface Props {
  selected: string
  onSelect: (url: string) => void
  onUploaded: () => void
}

export function AvatarPicker({ selected, onSelect, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onSelect(reader.result as string)
      onUploaded()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="avatar-dp-row">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        className="avatar-dp motion-press"
        onClick={() => fileRef.current?.click()}
        title="Change profile photo"
      >
        <motion.img key={selected} src={selected} className="avatar-dp-img" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} />
        <span className="avatar-dp-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </motion.button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  )
}
