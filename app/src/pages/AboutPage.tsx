import styles from './Page.module.css'

export default function AboutPage() {
  return (
    <section className={styles.page} aria-labelledby="about-title">
      <div className={styles.intro}>
        <h1 id="about-title" className={styles.title}>
          About Bulig
        </h1>
        <p className={styles.lead}>
          Help Along the Way. Road help and local services wherever you travel, one checked
          area at a time.
        </p>
      </div>
      <p className={styles.card}>
        Bulig is free to use. It never dispatches anyone and never sends your location. It
        only shows numbers and places someone has checked, and hides numbers nobody has
        checked in the last 180 days.
      </p>
    </section>
  )
}
