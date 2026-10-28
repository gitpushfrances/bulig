import styles from './Page.module.css'

export default function EmergencyPage() {
  return (
    <section className={styles.page} aria-labelledby="emergency-title">
      <h1 id="emergency-title" className={styles.title}>
        Emergency Help
      </h1>
      <p className={styles.lead}>
        Checked emergency numbers for Guiuan and Mercedes. No login needed.
      </p>
      <span className={styles.badge}>Coming in v0.2</span>
      <p className={styles.card}>
        This page will list 911 first, then local MDRRMO, police, fire and
        rescue numbers, each with the date it was last checked.
      </p>
    </section>
  )
}
