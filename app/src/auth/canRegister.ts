// crypto.subtle only exists on HTTPS (or localhost). Without it, sign-up is switched off.
export function canRegister(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}
