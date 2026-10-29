import { Navigate, Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
import LocationProvider from './location/LocationProvider.tsx'
import Layout from './components/Layout.tsx'
import RequireAccount from './components/RequireAccount.tsx'
import HomePage from './pages/HomePage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import CategoryPage from './pages/CategoryPage.tsx'
import EmergencyPage from './pages/EmergencyPage.tsx'
import MapPage from './pages/MapPage.tsx'
import SavedPage from './pages/SavedPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import { ChangePasswordPage, EditProfilePage } from './pages/AccountPages.tsx'
import { HelpPage, LicensesPage, PrivacyPage, TermsPage } from './pages/InfoPages.tsx'
import AboutPage from './pages/AboutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SignupPage from './pages/SignupPage.tsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx'
import DataProvider from './data/DataProvider.tsx'

// These paths are permanent: links shared on Facebook must keep working.
// Emergency (/emergency) is open to everyone, always. Everything else needs an account: a guest
// ("Continue without an account") sees a gate, anyone else goes to /login and comes back after.
export default function App() {
  return (
    <LocationProvider>
      <DataProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
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
                <Route path="services/:category" element={<CategoryPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="saved" element={<SavedPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="profile/edit" element={<EditProfilePage />} />
                <Route path="profile/password" element={<ChangePasswordPage />} />
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
