import { CaretRight, UserCircle, X } from '@phosphor-icons/react'
import { Link } from 'react-router'
import type { Account } from '../auth/types.ts'
import { missingDetails } from '../auth/finishProfile.ts'
import styles from './FinishProfile.module.css'

const WORDS = {
  photo: 'a photo',
  homeArea: 'your home area',
} as const

// One quiet row: what's missing, and a way to add it. Never on the emergency path; on Home it sits
// under the header and closes for good with the X.
export default function FinishProfile({ account, onClose }: { account: Account; onClose?: () => void }) {
  const missing = missingDetails(account)
  if (missing.length === 0) return null
  const what = missing.map((m) => WORDS[m]).join(' and ')

  return (
    <div className={styles.card}>
      <Link to="/profile/edit" className={styles.body}>
        <UserCircle className={styles.icon} size={28} aria-hidden="true" />
        <span className={styles.text}>
          <strong>Finish your profile</strong>
          <span>Add {what}. It takes a minute.</span>
        </span>
        <CaretRight className={styles.chevron} size={18} aria-hidden="true" />
      </Link>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Not now">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
