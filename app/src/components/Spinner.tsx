import styles from './Spinner.module.css'

// A small spinning ring for a button that is waiting on the server. The button's text says what
// is happening ("Signing in…"), so the ring itself is hidden from screen readers.
export default function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}
