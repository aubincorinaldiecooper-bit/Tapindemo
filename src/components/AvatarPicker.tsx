import { motion } from 'motion/react'
import { useRef, useState, type ChangeEvent } from 'react'
import { avatarsList } from '../data'

interface Props {
  selected: string
  onSelect: (url: string) => void
  onUploaded: () => void
}

export function AvatarPicker({ selected, onSelect, onUploaded }: Props) {
  const [custom, setCustom] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setCustom((prev) => [url, ...prev])
      onSelect(url)
      onUploaded()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="photo-actions-row mb-2">
        <motion.button type="button" whileTap={{ scale: 0.94 }} className="btn-photo-action motion-press" onClick={() => selfieRef.current?.click()}>
          📸 Take Selfie
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.94 }} className="btn-photo-action motion-press" onClick={() => fileRef.current?.click()}>
          📁 Upload Photo
        </motion.button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleUpload} />
      </div>
      <div className="avatar-picker-grid">
        {[...custom, ...avatarsList].map((url) => {
          const isSelected = url === selected
          return (
            <motion.img
              key={url}
              src={url}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: isSelected ? 1.1 : 1 }}
              whileHover={{ scale: isSelected ? 1.14 : 1.06 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`avatar-option ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(url)}
            />
          )
        })}
      </div>
    </>
  )
}
