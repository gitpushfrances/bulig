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
}

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
}
