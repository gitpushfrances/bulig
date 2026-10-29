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
