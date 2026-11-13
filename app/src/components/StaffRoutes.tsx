import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/context.ts'
import HomePage from '../pages/HomePage.tsx'
import StaffHomePage from '../pages/staff/StaffHomePage.tsx'
import { can } from '../rules/permissions.ts'
import { useStaffView } from '../staff/mode.ts'

// Staff screens are for moderators and admins only. The server checks every /staff request again;
// this only keeps the screens away from everyone else.
export function RequireStaff() {
  const { account } = useAuth()
  return can(account, 'review') ? <Outlet /> : <Navigate to="/" replace />
}

// "/" is the staff Home for moderators and admins, and the everyday Home for everyone else (and for
// staff who switched to "Use as a traveller").
export function HomeRoute() {
  const { account } = useAuth()
  return useStaffView(account) ? <StaffHomePage /> : <HomePage />
}
