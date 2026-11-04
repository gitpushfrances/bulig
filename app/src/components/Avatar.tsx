import { useAuth } from '../auth/context.ts'
import styles from './Avatar.module.css'

// "John Q. Dela Cruz" -> "JD": first and last word, so long Filipino names stay two letters.
function initialsOf(name: string | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

// The person's photo in a circle, or Ropi's head when there is none (and when signed out).
// On Home (where Ropi never goes, UI-UX.md "Mascot"), `initials` shows the name's initials instead.
// Decorative: the name or the tab label next to it says who or what it is.
export default function Avatar({ size, ring = false, initials = false }: { size: number; ring?: boolean; initials?: boolean }) {
  const { account } = useAuth()
  const photo = account?.photo
  const letters = initials && !photo ? initialsOf(account?.name) : ''
  if (letters)
    return (
      <span
        className={`${styles.avatar} ${styles.initials} ${ring ? styles.ring : ''}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
        aria-hidden="true"
      >
        {letters}
      </span>
    )
  return (
    <span className={`${styles.avatar} ${ring ? styles.ring : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <img
        className={photo ? styles.photo : styles.ropi}
        src={photo ?? '/assets/mascot/ropi-head.webp'}
        width={size}
        height={size}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  )
}
