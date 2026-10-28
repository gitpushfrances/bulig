import styles from './Page.module.css'

export default function AboutPage() {
  return (
    <section className={styles.page} aria-labelledby="about-title">
      <h1 id="about-title" className={styles.title}>
        About Bulig
      </h1>
      <p className={styles.lead}>
        Help Along the Way. Road help and local services, starting in Guiuan
        and Mercedes, Eastern Samar.
      </p>
      <p className={styles.card}>
        Bulig is free to use. It never dispatches anyone and never sends your
        location. It only shows numbers and places someone has checked.
      </p>
    </section>
  )
}
