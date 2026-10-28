import { Link } from 'react-router'
import styles from './Page.module.css'

export default function NotFoundPage() {
  return (
    <section className={styles.page} aria-labelledby="notfound-title">
      <h1 id="notfound-title" className={styles.title}>
        Page not found
      </h1>
      <p className={styles.lead}>
        <Link to="/">Go to Emergency Help</Link>
      </p>
    </section>
  )
}
