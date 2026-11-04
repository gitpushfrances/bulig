import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { hideSplash } from './splash.ts'
import AuthProvider from './auth/AuthProvider.tsx'
import LocationProvider from './location/LocationProvider.tsx'
import Layout from './components/Layout.tsx'
import RequireAccount from './components/RequireAccount.tsx'
import HomePage from './pages/HomePage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import NearbyPage from './pages/NearbyPage.tsx'
import PlacePage from './pages/PlacePage.tsx'
import EmergencyPage from './pages/EmergencyPage.tsx'
import MapPage from './pages/MapPage.tsx'
import SavedPage from './pages/SavedPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import { ChangeEmailPage, ChangePasswordPage, EditProfilePage } from './pages/AccountPages.tsx'
import { HelpPage, LicensesPage, PrivacyPage, TermsPage } from './pages/InfoPages.tsx'
import AboutPage from './pages/AboutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SignupPage from './pages/SignupPage.tsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx'
import ResetPasswordPage from './pages/ResetPasswordPage.tsx'
import ConfirmEmailPage from './pages/ConfirmEmailPage.tsx'
import DataProvider from './data/DataProvider.tsx'

// These paths are permanent: links shared on Facebook must keep working.
// Emergency (/emergency) is open to everyone, always, with no account (a shared link, the hazard button, the 404 page).
// Everything else needs an account: /login, then back.
export default function App() {
  // The app has drawn its first screen: the splash can go.
  useEffect(hideSplash, [])

  return (
    <LocationProvider>
      <DataProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="confirm-email" element={<ConfirmEmailPage />} />
            <Route path="welcome" element={<Navigate to="/login" replace />} />
            <Route element={<Layout />}>
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="licenses" element={<LicensesPage />} />
              <Route element={<RequireAccount />}>
                <Route index element={<HomePage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="services/:category" element={<NearbyPage />} />
                <Route path="nearby/:need" element={<NearbyPage />} />
                <Route path="place/:id" element={<PlacePage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="saved" element={<SavedPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="profile/edit" element={<EditProfilePage />} />
                <Route path="profile/password" element={<ChangePasswordPage />} />
                <Route path="profile/email" element={<ChangeEmailPage />} />
                <Route path="about" element={<AboutPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </DataProvider>
    </LocationProvider>
  )
}
