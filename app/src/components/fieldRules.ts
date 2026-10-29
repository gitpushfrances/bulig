// Shared by the sign-in, sign-up and reset forms.
export const EMAIL_INPUT = {
  type: 'email',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  inputMode: 'email',
  spellCheck: false,
} as const

export const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
