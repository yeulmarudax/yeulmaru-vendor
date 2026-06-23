import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VendorPage from './pages/VendorPage'
import RecommendPage from './pages/RecommendPage'
import TransactionPage from './pages/TransactionPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 인증 보호 라우트 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vendors" element={<VendorPage />} />
            <Route path="recommend" element={<RecommendPage />} />
            <Route path="transactions" element={<TransactionPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}