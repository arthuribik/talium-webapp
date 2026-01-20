import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { useAppSelector } from '@/store/hooks';
import { useEffect, useState } from 'react';
import Login from '@/pages/landing/Login';
import Register from '@/pages/landing/Register';
import RegisterBusiness from '@/pages/landing/RegisterBusiness';
import Dashboard from '@/pages/app/Dashboard';
import ProfessionalSetup from '@/pages/app/ProfessionalSetup';
import OrganisationSetup from '@/pages/app/OrganisationSetup';
import Jobs from '@/pages/app/Jobs';
import CreateJob from '@/pages/app/CreateJob';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import CreateSuperAdmin from '@/pages/admin/CreateSuperAdmin';
import InviteAdmin from '@/pages/admin/InviteAdmin';
import ProfessionalsList from '@/pages/admin/ProfessionalsList';
import ProfessionalDetail from '@/pages/admin/ProfessionalDetail';
import OrganizationsList from '@/pages/admin/OrganizationsList';
import OrganizationDetail from '@/pages/admin/OrganizationDetail';
import JobsList from '@/pages/admin/JobsList';
import JobDetail from '@/pages/admin/JobDetail';
import TransactionsList from '@/pages/admin/TransactionsList';
import TransactionDetail from '@/pages/admin/TransactionDetail';
import Settings from '@/pages/admin/Settings';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Give Redux Persist a moment to rehydrate
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (loading || isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // Check both Redux state and localStorage as fallback
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const hasAuth = (isAuthenticated && user) || (token && userStr);
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
  // Wait for auth state to be loaded (avoid redirect during rehydration)
  // Check localStorage directly as a fallback since Redux Persist might not have rehydrated yet
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Give Redux Persist a moment to rehydrate
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading || isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // Check both Redux state and localStorage as fallback
  let token: string | null = null;
  let userStr: string | null = null;
  let currentUser: any = null;
  
  try {
    token = localStorage.getItem('token');
    userStr = localStorage.getItem('user');
    currentUser = user || (userStr ? JSON.parse(userStr) : null);
  } catch (error) {
    console.error('Error reading auth from localStorage:', error);
  }
  
  const hasAuth = (isAuthenticated && user) || (token && userStr);
  
  if (!hasAuth) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Verify user is admin
  if (currentUser && currentUser.userType !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-business" element={<RegisterBusiness />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/create-super-admin" element={<CreateSuperAdmin />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/invite"
        element={
          <AdminRoute>
            <InviteAdmin />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/professionals"
        element={
          <AdminRoute>
            <ProfessionalsList />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/professionals/:id"
        element={
          <AdminRoute>
            <ProfessionalDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/organizations"
        element={
          <AdminRoute>
            <OrganizationsList />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/organizations/:id"
        element={
          <AdminRoute>
            <OrganizationDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <AdminRoute>
            <JobsList />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/jobs/:id"
        element={
          <AdminRoute>
            <JobDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <AdminRoute>
            <TransactionsList />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/transactions/:id"
        element={
          <AdminRoute>
            <TransactionDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <Settings />
          </AdminRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/professional/setup"
        element={
          <ProtectedRoute>
            <ProfessionalSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organisation/setup"
        element={
          <ProtectedRoute>
            <OrganisationSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={<Jobs />}
      />
      <Route
        path="/jobs/create"
        element={
          <ProtectedRoute>
            <CreateJob />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div className="min-h-screen flex items-center justify-center">Loading...</div>} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;

