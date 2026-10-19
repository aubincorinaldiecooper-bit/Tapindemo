import { motion } from 'motion/react'
import { useRef, type ChangeEvent } from 'react'

const AVATAR_PX = 160

// Camera photos are several MB; the avatar travels to every phone in the room, so shrink it first.
async function shrinkToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_PX
  canvas.height = AVATAR_PX
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_PX, AVATAR_PX)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

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
    shrinkToDataUrl(file).then((url) => {
      onSelect(url)
      onUploaded()
    })
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
