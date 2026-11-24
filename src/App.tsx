import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import CartDrawer from './components/store/CartDrawer';
import FloatingCartBar from './components/store/FloatingCartBar';
import OAuthRedirectListener from './components/store/OAuthRedirectListener';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import AdminDashboardHome from './pages/admin/AdminDashboardHome';
import BannersPage from './pages/admin/BannersPage';
import CategoriesPage from './pages/admin/CategoriesPage';
import CouponsPage from './pages/admin/CouponsPage';
import CustomersPage from './pages/admin/CustomersPage';
import DeliverySettingsPage from './pages/admin/DeliverySettingsPage';
import LoginPage from './pages/admin/LoginPage';
import OrdersPage from './pages/admin/OrdersPage';
import PosPage from './pages/admin/PosPage';
import ProductEditorPage from './pages/admin/ProductEditorPage';
import ProductsListPage from './pages/admin/ProductsListPage';
import ResetPasswordPage from './pages/admin/ResetPasswordPage';
import SettingsPage from './pages/admin/SettingsPage';
import CheckoutPage from './pages/store/CheckoutPage';
import CustomerAccountPage from './pages/store/CustomerAccountPage';
import OrderConfirmationPage from './pages/store/OrderConfirmationPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import StoreHomePage from './pages/store/StoreHomePage';

export default function App() {
  return (
    <HashRouter>
      <StoreSettingsProvider>
        <AuthProvider>
          <OAuthRedirectListener />
          <CartProvider>
            <CartDrawer />
            <FloatingCartBar />
            <Routes>
              <Route path="/" element={<StoreHomePage />} />
              <Route path="/produto/:slug" element={<ProductDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/minha-conta" element={<CustomerAccountPage />} />
              <Route path="/pedido/:id" element={<OrderConfirmationPage />} />

              <Route path="/painel/login" element={<LoginPage />} />
              <Route path="/painel/redefinir-senha" element={<ResetPasswordPage />} />

              <Route path="/painel" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminDashboardHome />} />
                  <Route path="pdv" element={<PosPage />} />
                  <Route path="produtos" element={<ProductsListPage />} />
                  <Route path="produtos/novo" element={<ProductEditorPage />} />
                  <Route path="produtos/:id" element={<ProductEditorPage />} />
                  <Route path="categorias" element={<CategoriesPage />} />
                  <Route path="banners" element={<BannersPage />} />
                  <Route path="cupons" element={<CouponsPage />} />
                  <Route path="entrega" element={<DeliverySettingsPage />} />
                  <Route path="pedidos" element={<OrdersPage />} />
                  <Route path="clientes" element={<CustomersPage />} />
                  <Route path="configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </HashRouter>
  );
}
