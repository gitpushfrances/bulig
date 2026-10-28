import { Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import EmergencyPage from './pages/EmergencyPage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

// These three paths are permanent: links shared on Facebook must keep working.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<EmergencyPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
