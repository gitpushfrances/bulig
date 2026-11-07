// Usernames, API.md §4.1 "Usernames". The server checks the same rules; these only give the
// message before a round trip. No "@" ever, so a sign-in value with one is always an email.
export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
const PATTERN = /^[a-z][a-z0-9._]{2,19}$/

// Names that could pass for Bulig staff or a hotline. Keep in step with API.md.
export const RESERVED_USERNAMES = [
  'admin', 'administrator', 'bulig', 'moderator', 'mod', 'staff', 'support', 'help',
  'root', 'system', 'emergency', 'police', 'api', 'me', 'null', 'undefined',
] as const

// Case-insensitive: "Ana_Reyes" and "ana_reyes" are one name.
export const normalizeUsername = (v: string) => v.trim().toLowerCase()

export const isReservedUsername = (v: string) => (RESERVED_USERNAMES as readonly string[]).includes(normalizeUsername(v))

// '' when it is fine, else the words to show under the field.
export function usernameError(v: string): string {
  const name = normalizeUsername(v)
  if (!name) return 'Choose a username.'
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return `Use ${USERNAME_MIN} to ${USERNAME_MAX} characters.`
  if (!/^[a-z]/.test(name)) return 'Start with a letter.'
  if (!PATTERN.test(name)) return 'Use only letters, numbers, dots and underscores.'
  if (isReservedUsername(name)) return "That username isn't allowed. Try another."
  return ''
}

export const USERNAME_HINT = `${USERNAME_MIN}–${USERNAME_MAX} letters, numbers, dots or underscores. You can sign in with it.`

export const USERNAME_INPUT = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const
