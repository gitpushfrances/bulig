import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/context.ts'

// Everything except Emergency needs an account: the login, then back here. Emergency stays open
// to everyone (its route sits outside this one, and every sign-in screen links to it).
export default function RequireAccount() {
  const { account } = useAuth()
  const { pathname, search } = useLocation()
  const here = pathname + search

  if (account) return <Outlet />
  return <Navigate to={here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`} replace />
}
