import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SignalRProvider } from './context/SignalRContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import DeactivatedDriversPage from './pages/DeactivatedDriversPage';
import DriverDetailPage from './pages/DriverDetailPage';
import RegisterDriverPage from './pages/RegisterDriverPage';
import PendingDriversPage from './pages/PendingDriversPage';
import GrantAdminPage from './pages/GrantAdminPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import PromotionsPage from './pages/PromotionsPage';
import VehicleApprovalsPage from './pages/VehicleApprovalsPage';
import FleetsPage from './pages/FleetsPage';
import CorporatePage from './pages/CorporatePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SignalRProvider>
      {children}
    </SignalRProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="account" element={<AccountSettingsPage />} />
        <Route path="pending-approvals" element={<PendingDriversPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="drivers/deactivated" element={<DeactivatedDriversPage />} />
        <Route path="drivers/new" element={<RegisterDriverPage />} />
        <Route path="drivers/:id" element={<DriverDetailPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="vehicle-requests" element={<VehicleApprovalsPage />} />
        <Route path="fleets" element={<FleetsPage />} />
        <Route path="corporate" element={<CorporatePage />} />
        <Route path="grant-admin" element={<GrantAdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
