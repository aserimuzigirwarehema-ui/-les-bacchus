import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Permission } from '@/types';
import { FullPageLoader } from '@/components/ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, requiredPermission, adminOnly }: ProtectedRouteProps) {
  const { session, profile, loading, isAdmin, hasPermission } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullPageLoader label="Chargement du profil..." />;
  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold">Compte désactivé</p>
        <p className="text-sm text-muted">Votre accès a été suspendu. Contactez l'administrateur.</p>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to={isAdmin ? '/dashboard' : '/pos'} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    const fallback = hasPermission('enregistrer_vente')
      ? '/pos'
      : hasPermission('voir_stocks')
        ? '/stock'
        : '/pos';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
