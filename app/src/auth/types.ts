import type { AreaId } from '../types.ts'

// The roles in docs/WORKFLOW.md and API.md §1. What each one may do is decided in one place:
// can() in src/rules/permissions.ts.
export const ROLES = ['user', 'contributor', 'moderator', 'admin'] as const
export type Role = (typeof ROLES)[number]

export interface Account {
  email: string
  name: string
  role: Role
  // Moderators only: the areas they look after (a city, municipality or barangay).
  // Each one covers the areas inside it. Empty for users and admins.
  areas: AreaId[]
  // ISO date the account was made. Missing for accounts made before this was recorded.
  createdAt?: string
  // Optional details the person adds in Profile > Edit profile.
  phone?: string
  // Free text ("Surok, Guiuan, Eastern Samar"); older accounts may hold a listed area's ID.
  homeArea?: string | null
  // A small square photo (WebP data URL, 256px) chosen in Edit profile. None = Ropi's head.
  photo?: string
  // A new email waiting for its confirmation link (API.md §5.7). Sign-in still uses `email` until then.
  pendingEmail?: string
  // False for an account made with Google that never set a password (API.md §4.7). Missing = true.
  hasPassword?: boolean
  // True once a Google account is linked: "Continue with Google" signs in to this account.
  google?: boolean
}

// The fields Edit profile may change.
export type ProfileDetails = Pick<Account, 'name' | 'phone' | 'homeArea' | 'photo'>

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  contributor: 'Contributor',
  moderator: 'Moderator',
  admin: 'Admin',
}
