import type { CountryCode } from '../types.ts'

// Per-country config that has to work before any data loads. Everything else
// country-specific lives in public/data/<cc>/.

// Countries with a data folder. Add one here when public/data/<cc>/ is ready.
export const LIVE_COUNTRIES: CountryCode[] = ['PH']

// Shown on Emergency Help while data is loading or when it fails to load, so the
// page is never empty. This is the one place a national number is allowed in code.
export const FALLBACK_EMERGENCY: Record<CountryCode, string> = {
  PH: '911',
}

// Saved choice first, then the region in the browser language ("en-PH", "fil-PH"),
// then the first live country. Never asks for location permission.
export function pickCountry(saved: string | null, languages: readonly string[]): CountryCode {
  if (saved && LIVE_COUNTRIES.includes(saved)) return saved
  for (const lang of languages) {
    const region = lang.split('-')[1]?.toUpperCase()
    if (region && LIVE_COUNTRIES.includes(region)) return region
  }
  return LIVE_COUNTRIES[0]
}
