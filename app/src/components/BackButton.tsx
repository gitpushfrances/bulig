import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import styles from '../pages/Page.module.css'
import { useCanGoBack } from './useCanGoBack.ts'

// Back to wherever the person came from, or to `fallback` when they arrived on this page directly.
export default function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return (
    <button type="button" className={styles.back} onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}>
      <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
      Back
    </button>
  )
}
