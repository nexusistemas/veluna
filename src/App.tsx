import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import AdminDashboardHome from './pages/admin/AdminDashboardHome';
import AdminModulePlaceholder from './pages/admin/AdminModulePlaceholder';
import BannersPage from './pages/admin/BannersPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import CouponsPage from './pages/admin/CouponsPage';
import DeliverySettingsPage from './pages/admin/DeliverySettingsPage';
import LoginPage from './pages/admin/LoginPage';
import ProductEditorPage from './pages/admin/ProductEditorPage';
import ProductsListPage from './pages/admin/ProductsListPage';
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
                <Route path="produtos" element={<ProductsListPage />} />
                <Route path="produtos/novo" element={<ProductEditorPage />} />
                <Route path="produtos/:id" element={<ProductEditorPage />} />
                <Route path="categorias" element={<CategoriesPage />} />
                <Route path="banners" element={<BannersPage />} />
                <Route path="cupons" element={<CouponsPage />} />
                <Route path="entrega" element={<DeliverySettingsPage />} />
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
