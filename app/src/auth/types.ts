import type { AreaId } from '../types.ts'

// The three roles in docs/WORKFLOW.md. What each one may do is decided in one place:
// can() in src/rules/permissions.ts.
export const ROLES = ['user', 'moderator', 'admin'] as const
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
  homeArea?: AreaId | null
  // A small square photo (WebP data URL, 256px) chosen in Edit profile. None = Ropi's head.
  photo?: string
}

// The fields Edit profile may change.
export type ProfileDetails = Pick<Account, 'name' | 'phone' | 'homeArea' | 'photo'>

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
}
