import { Navigate, Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
import { useAuth } from './auth/context.ts'
import LocationProvider from './location/LocationProvider.tsx'
import Layout from './components/Layout.tsx'
import HomePage from './pages/HomePage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import CategoryPage from './pages/CategoryPage.tsx'
import EmergencyPage from './pages/EmergencyPage.tsx'
import SavedPage from './pages/SavedPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import WelcomePage from './pages/WelcomePage.tsx'
import DataProvider from './data/DataProvider.tsx'

// These paths are permanent: links shared on Facebook must keep working.
// `/` is Home, which keeps 911 one tap away, as the v0.2 Emergency page did.
// The first open of `/` on a phone shows Welcome instead; it has its own Call 911 link.
// Deep links never redirect, so a shared link always opens what was shared.
function Start() {
  const { account, welcomed } = useAuth()
  return account || welcomed ? <HomePage /> : <Navigate to="/welcome" replace />
}

export default function App() {
  return (
    <LocationProvider>
      <DataProvider>
        <AuthProvider>
          <Routes>
            <Route path="welcome" element={<WelcomePage />} />
            <Route element={<Layout />}>
              <Route index element={<Start />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="services/:category" element={<CategoryPage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="saved" element={<SavedPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </DataProvider>
    </LocationProvider>
  )
}
