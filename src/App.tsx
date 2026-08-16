import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PosPage } from '@/pages/PosPage';
import { StockPage } from '@/pages/StockPage';
import { SalesPage } from '@/pages/SalesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { FullPageLoader } from '@/components/ui/Loading';

function AppRoutes() {
  const { session, profile, loading, isAdmin, hasPermission } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!session) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (session && !profile) {
    return <FullPageLoader label="Chargement du profil..." />;
  }

  const homeRoute = isAdmin
    ? '/dashboard'
    : hasPermission('enregistrer_vente')
      ? '/pos'
      : hasPermission('voir_stocks')
        ? '/stock'
        : '/dashboard';

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to={homeRoute} replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPermission="voir_rapports">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute requiredPermission="enregistrer_vente">
              <PosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute requiredPermission="voir_stocks">
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute requiredPermission="voir_rapports">
              <SalesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute adminOnly>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={homeRoute} replace />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
