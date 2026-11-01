import styles from './RopiLoader.module.css'

// One frame of ropi-walk.webp: 8 frames side by side, each 225 × 180.
const FRAMES = 8
const FRAME_W = 225
const FRAME_H = 180

interface Props {
  // Rendered height in px. UI-UX.md caps Ropi at 160px on a phone.
  height?: number
}

// Ropi walking, for a wait the person can see. Only where UI-UX.md allows Ropi: never on Home
// or Emergency. Walks over a skeleton (Skeleton.tsx) and only once the wait runs long.
export default function RopiLoader({ height = 96 }: Props) {
  return (
    <span
      className={styles.loader}
      style={{ height, width: (height * FRAME_W) / FRAME_H }}
      aria-hidden="true"
      data-testid="ropi-loader"
    >
      <img
        className={styles.strip}
        src="/assets/mascot/ropi-walk.webp"
        width={FRAME_W * FRAMES}
        height={FRAME_H}
        alt=""
        decoding="async"
        draggable={false}
      />
    </span>
  )
}
