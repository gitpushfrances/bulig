import { CircleQuestionMark, Heart, Lightbulb, Sparkle, Sparkles, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import styles from './Mascot.module.css'

export type MascotVariant = 'ready' | 'friendly' | 'thinking' | 'head'

// Intrinsic size of each exported WebP, so the image reserves its space before it loads.
const SIZES: Record<MascotVariant, { width: number; height: number }> = {
  ready: { width: 342, height: 480 },
  friendly: { width: 354, height: 480 },
  thinking: { width: 260, height: 480 },
  head: { width: 461, height: 480 },
}

// Drawn in code, not in the image, so they can move. Each has its own drift to the side.
const REACTIONS: Record<MascotVariant, { icon: LucideIcon; dx: number }[]> = {
  ready: [
    { icon: Sparkles, dx: -22 },
    { icon: Sparkle, dx: 4 },
    { icon: Sparkles, dx: 24 },
  ],
  friendly: [
    { icon: Heart, dx: -20 },
    { icon: Heart, dx: 4 },
    { icon: Heart, dx: 22 },
  ],
  thinking: [
    { icon: CircleQuestionMark, dx: -16 },
    { icon: Lightbulb, dx: 18 },
  ],
  head: [
    { icon: Heart, dx: -14 },
    { icon: Heart, dx: 16 },
  ],
}

// Matches the longest animation in Mascot.module.css (float delay + duration). Under 600ms.
export const REACTION_MS = 600

interface Props {
  variant: MascotVariant
  // Rendered height in px. UI-UX.md caps Ropi at 160px on a phone.
  height?: number
}

// Ropi, the mascot. Decorative only: hidden from assistive technology, never a control.
// Stands still until tapped, then plays one short reaction. See UI-UX.md, "Mascot: Ropi".
export default function Mascot({ variant, height = 128 }: Props) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => setPlaying(false), REACTION_MS)
    return () => clearTimeout(timer)
  }, [playing])

  const size = SIZES[variant]
  const head = variant === 'head'
  const classes = [styles.mascot, head && styles.head, playing && styles.playing].filter(Boolean).join(' ')

  return (
    <span
      className={classes}
      style={{ height }}
      aria-hidden="true"
      data-testid="mascot"
      data-variant={variant}
      // A tap mid-reaction is ignored: the reaction plays once, then stops.
      onClick={() => setPlaying(true)}
    >
      <img
        className={styles.image}
        src={`/assets/mascot/ropi-${variant}.webp`}
        width={size.width}
        height={size.height}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      {playing &&
        REACTIONS[variant].map(({ icon: Icon, dx }, i) => (
          <Icon
            key={i}
            className={styles.float}
            style={{ '--dx': `${dx}px`, animationDelay: `${i * 40}ms` } as CSSProperties}
            size={18}
            strokeWidth={2}
            aria-hidden="true"
          />
        ))}
    </span>
  )
}
