/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "api" reads public data from the backend (with the JSON files as fallback); anything else, the JSON files.
  readonly VITE_DATA_SOURCE?: string
  // The backend's base URL, e.g. https://bulig-backend.onrender.com/api/v1
  readonly VITE_API_URL?: string
  // Google sign-in's OAuth client ID (public, not a secret). Unset = no "Continue with Google" button.
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
