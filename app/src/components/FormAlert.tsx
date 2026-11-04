import { X } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import styles from './FormAlert.module.css'

// A form-level error on the sign-in screens (wrong password, no signal): a tinted box that slides
// in, with an X to dismiss it. Field errors stay under their field.
export default function FormAlert({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className={styles.alert} role="alert">
      <p className={styles.text}>{children}</p>
      {onClose && (
        <button type="button" className={styles.close} aria-label="Dismiss" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
