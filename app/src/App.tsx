import { Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.tsx'
import Layout from './components/Layout.tsx'
import EmergencyPage from './pages/EmergencyPage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import SavedPage from './pages/SavedPage.tsx'
import AccountPage from './pages/AccountPage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import DataProvider from './data/DataProvider.tsx'

// These paths are permanent: links shared on Facebook must keep working.
export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<EmergencyPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </DataProvider>
  )
}
