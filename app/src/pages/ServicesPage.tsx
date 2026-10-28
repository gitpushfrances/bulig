import styles from './Page.module.css'

export default function ServicesPage() {
  return (
    <section className={styles.page} aria-labelledby="services-title">
      <h1 id="services-title" className={styles.title}>
        Services
      </h1>
      <p className={styles.lead}>
        Vulcanizing shops, mechanics, hospitals, gas stations and places to eat
        along the road.
      </p>
      <span className={styles.badge}>Coming in v0.2</span>
      <p className={styles.card}>
        Pick a town and a category, then call or get directions in a few taps.
      </p>
    </section>
  )
}
