import styles from './Page.module.css'

export default function EmergencyPage() {
  return (
    <section className={styles.page} aria-labelledby="emergency-title">
      <h1 id="emergency-title" className={styles.title}>
        Emergency Help
      </h1>
      <p className={styles.lead}>
        Checked emergency numbers for where you are. No login needed.
      </p>
      <span className={styles.badge}>Coming in v0.2</span>
      <p className={styles.card}>
        This page will list your country&apos;s main emergency number first
        (like 911 or 112), then local police, fire, medical and rescue numbers,
        each with the date it was last checked.
      </p>
    </section>
  )
}
