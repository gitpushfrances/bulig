// "Continue with Google" through Google Identity Services (GIS), docs/API.md §4.7.
//
// The button hands the page an ID token (a JWT signed by Google). The app sends it to the backend,
// which checks the signature, the audience (this client ID) and that Google verified the email,
// then answers with a Sanctum token like a normal sign-in. There is no client secret in the app and
// no redirect: the client ID is public by design.
//
// Free: GIS has no fee and no quota for sign-in. The script loads only on the sign-in screens, never
// before Emergency.

const SCRIPT = 'https://accounts.google.com/gsi/client'

// Set in Cloudflare (and .env.local for dev) once the Google Cloud OAuth client exists. Unset = no
// button anywhere, so the app can ship before the backend has POST /auth/google.
export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined

// The bits of window.google.accounts.id the app uses.
interface CredentialResponse {
  credential?: string
}
interface GsiId {
  initialize(config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    itp_support?: boolean
    use_fedcm_for_button?: boolean
    context?: 'signin' | 'signup' | 'use'
  }): void
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      logo_alignment?: 'left' | 'center'
      width?: number
      locale?: string
    },
  ): void
  disableAutoSelect(): void
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } }
  }
}

// Google blocks its sign-in inside app web views (Facebook, Messenger, Instagram, TikTok, LINE…) with
// "403 disallowed_useragent". Bulig links are shared on Facebook, so this is the common case in the
// Philippines: the page says how to open it in Chrome instead of showing a button that fails.
export function inAppBrowser(ua: string = navigator.userAgent): string | null {
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return /Messenger|MESSENGER|Orca/i.test(ua) ? 'Messenger' : 'Facebook'
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'TikTok'
  if (/\bLine\//i.test(ua)) return 'LINE'
  // A plain Android web view (other apps' in-app browsers) carries "; wv)".
  if (/Android.*; wv\)/i.test(ua)) return 'this app'
  return null
}

let loading: Promise<GsiId> | null = null

// Loads the GIS script once. Rejects when offline or blocked, so the page can say so.
export function loadGoogle(timeoutMs = 10_000): Promise<GsiId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (loading) return loading
  loading = new Promise<GsiId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.defer = true
    const timer = window.setTimeout(() => fail(new Error('Google sign-in took too long to load.')), timeoutMs)
    const fail = (err: Error) => {
      window.clearTimeout(timer)
      script.remove()
      loading = null
      reject(err)
    }
    script.onload = () => {
      window.clearTimeout(timer)
      const id = window.google?.accounts?.id
      if (id) resolve(id)
      else fail(new Error('Google sign-in did not start.'))
    }
    script.onerror = () => fail(new Error("Couldn't load Google sign-in."))
    document.head.appendChild(script)
  })
  return loading
}

// GIS keeps one callback per page. The button that is on screen now gets the token.
let onToken: ((idToken: string) => void) | null = null
let initialised = false

export function listenForGoogle(id: GsiId, clientId: string, callback: (idToken: string) => void) {
  onToken = callback
  if (initialised) return
  initialised = true
  id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response.credential) onToken?.(response.credential)
    },
    // A popup keeps the person on this screen (and its ?next=); no backend redirect page needed.
    ux_mode: 'popup',
    auto_select: false,
    itp_support: true,
    use_fedcm_for_button: true,
  })
}

// Tests only.
export function forgetGoogle() {
  loading = null
  onToken = null
  initialised = false
}
