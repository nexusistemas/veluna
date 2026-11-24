import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import AdminDashboardHome from './pages/admin/AdminDashboardHome';
import AdminModulePlaceholder from './pages/admin/AdminModulePlaceholder';
import LoginPage from './pages/admin/LoginPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import StoreHomePlaceholder from './pages/store/StoreHomePlaceholder';

export default function App() {
  return (
    <HashRouter>
      <StoreSettingsProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<StoreHomePlaceholder />} />
            <Route path="/painel/login" element={<LoginPage />} />
            <Route path="/painel/redefinir-senha" element={<ResetPasswordPage />} />

            <Route path="/painel" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboardHome />} />
                <Route path="pdv" element={<AdminModulePlaceholder moduleKey="pdv" />} />
                <Route path="produtos" element={<AdminModulePlaceholder moduleKey="produtos" />} />
                <Route path="categorias" element={<AdminModulePlaceholder moduleKey="categorias" />} />
                <Route path="banners" element={<AdminModulePlaceholder moduleKey="banners" />} />
                <Route path="cupons" element={<AdminModulePlaceholder moduleKey="cupons" />} />
                <Route path="entrega" element={<AdminModulePlaceholder moduleKey="entrega" />} />
                <Route path="pedidos" element={<AdminModulePlaceholder moduleKey="pedidos" />} />
                <Route
                  path="configuracoes"
                  element={<AdminModulePlaceholder moduleKey="configuracoes" />}
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </StoreSettingsProvider>
    </HashRouter>
  );
}
