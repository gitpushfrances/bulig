import { useAuth } from '../auth/context.ts'
import styles from './Avatar.module.css'

// The person's photo in a circle, or Ropi's head when there is none (and when signed out).
// Decorative: the name or the tab label next to it says who or what it is.
export default function Avatar({ size, ring = false }: { size: number; ring?: boolean }) {
  const { account } = useAuth()
  const photo = account?.photo
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
