const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export function formatDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 'unknown' : dateFormat.format(t)
}

// "+63 55 000 0001" → "tel:+63550000001"
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function directionsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

// "PH" → "Philippines", from the browser's own list, so no country names live in code.
export function countryName(country: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(country) ?? country
  } catch {
    return country
  }
}

const ago = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

// "just now", "3 minutes ago", "2 hours ago".
export function timeAgo(ms: number, now = Date.now()): string {
  const minutes = Math.round((now - ms) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return ago.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  return hours < 24 ? ago.format(-hours, 'hour') : ago.format(-Math.round(hours / 24), 'day')
}
