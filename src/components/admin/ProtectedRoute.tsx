import { Navigate, Outlet } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-sm animate-pulse">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-stone-800">Veluna Cosméticos</p>
        <p className="mt-1 text-xs text-stone-500">Verificando acesso ao painel...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/painel/login" replace />;
  }

  return <Outlet />;
}
