import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import SafetyPage from './pages/SafetyPage'
import AboutPage from './pages/AboutPage'
import BlogPage from './pages/BlogPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import BannedPage from './pages/BannedPage'
import ChatEndPage from './pages/ChatEndPage'
import MatchLimitPage from './pages/MatchLimitPage'
import SearchingPage from './pages/SearchingPage'
import MaintenancePage from './pages/MaintenancePage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><LandingPage /></Layout>} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/safety" element={<SafetyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/banned" element={<BannedPage />} />
      <Route path="/chat-end" element={<ChatEndPage />} />
      <Route path="/match-limit" element={<MatchLimitPage />} />
      <Route path="/searching" element={<SearchingPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
