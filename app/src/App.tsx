import { Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
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
import DataProvider from './data/DataProvider.tsx'

// These paths are permanent: links shared on Facebook must keep working.
// `/` is Home, which keeps 911 one tap away, as the v0.2 Emergency page did.
export default function App() {
  return (
    <LocationProvider>
      <DataProvider>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
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
