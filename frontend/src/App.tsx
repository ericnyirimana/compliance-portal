import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuditVerifyPage } from './pages/AuditVerifyPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/applications/new" element={
                <RequireRole roles={['APPLICANT']}>
                  <NewApplicationPage />
                </RequireRole>
              } />
              <Route path="/applications/:id" element={<ApplicationDetailPage />} />
              <Route path="/admin/users" element={
                <RequireRole roles={['ADMIN']}>
                  <AdminUsersPage />
                </RequireRole>
              } />
              <Route path="/audit/verify" element={
                <RequireRole roles={['ADMIN', 'REVIEWER', 'DECISION_MAKER']}>
                  <AuditVerifyPage />
                </RequireRole>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
