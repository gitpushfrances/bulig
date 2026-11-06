import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

// A floating confirm (John, 2026-11-06): the page dims behind it and it rises in, centred. Built on
// <dialog>.showModal(), so it sits above the tab bar and the Emergency button, keeps focus inside,
// and Escape or Android Back (in Chrome) closes it. Phones without showModal (iOS 14) still get it
// floating: the same styles, opened with the `open` attribute.
// Never used on the emergency path: nothing may stand between a person and 911.
export default function Dialog({
  open,
  title,
  onClose,
  busy = false,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  // While saving, Escape and the backdrop don't close it.
  busy?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const busyRef = useRef(busy)
  const closeRef = useRef(onClose)
  useEffect(() => {
    busyRef.current = busy
    closeRef.current = onClose
  })

  useEffect(() => {
    const d = ref.current
    if (!d || !open) return
    if (typeof d.showModal === 'function') {
      if (!d.open) d.showModal()
    } else d.setAttribute('open', '')
    // Focus starts on the question, not on a button: no ring around "Use this photo" and no keyboard
    // popping up for a field; screen readers read the title first.
    heading.current?.focus({ preventScroll: true })
    // The page under it doesn't scroll while it's up.
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = before
      if (typeof d.close === 'function' && d.open) d.close()
      else d.removeAttribute('open')
    }
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busyRef.current) closeRef.current()
      }}
      // A tap on the dim backdrop (the dialog element itself, outside its card) closes it.
      onClick={(e) => {
        if (e.target === e.currentTarget && !busyRef.current) closeRef.current()
      }}
    >
      <div className={styles.card}>
        <h2 ref={heading} id="dialog-title" tabIndex={-1} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
