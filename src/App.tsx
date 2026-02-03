import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from '@/store/store';
import { useAppSelector } from '@/store/hooks';
import { useEffect, useState } from 'react';
import Home from '@/pages/landing/Home';
import About from '@/pages/landing/About';
import JobsLanding from '@/pages/landing/JobsLanding';
import ProfessionalsLanding from '@/pages/landing/ProfessionalsLanding';
import ProfessionalDetail from '@/pages/landing/ProfessionalDetail';
import OrganisationsLanding from '@/pages/landing/OrganisationsLanding';
import OrganisationDetail from '@/pages/landing/OrganisationDetail';
import LandingJobDetail from '@/pages/landing/JobDetail';
import Login from '@/pages/landing/Login';
import Register from '@/pages/landing/Register';
import RegisterBusiness from '@/pages/landing/RegisterBusiness';
import ProfessionalSetup from '@/pages/app/ProfessionalSetup';
import OrganisationSetup from '@/pages/app/OrganisationSetup';
import Jobs from '@/pages/app/Jobs';
import CreateJob from '@/pages/app/CreateJob';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import CreateSuperAdmin from '@/pages/admin/CreateSuperAdmin';
import InviteAdmin from '@/pages/admin/InviteAdmin';
import ProfessionalsList from '@/pages/admin/ProfessionalsList';
import AdminProfessionalDetail from '@/pages/admin/ProfessionalDetail';
import OrganizationsList from '@/pages/admin/OrganizationsList';
import OrganizationDetail from '@/pages/admin/OrganizationDetail';
import RegistrationsList from '@/pages/admin/RegistrationsList';
import RegistrationDetail from '@/pages/admin/RegistrationDetail';
import JobsList from '@/pages/admin/JobsList';
import JobDetail from '@/pages/admin/JobDetail';
import TransactionsList from '@/pages/admin/TransactionsList';
import TransactionDetail from '@/pages/admin/TransactionDetail';
import Settings from '@/pages/admin/Settings';
import NotFound from '@/pages/NotFound';
import OrganisationDashboard from '@/pages/organisation/OrganisationDashboard';
import ViewProfessionals from '@/pages/organisation/ViewProfessionals';
import OrganisationProfessionalDetail from '@/pages/organisation/ProfessionalDetail';
import PostJobs from '@/pages/organisation/PostJobs';
import OrganisationJobDetail from '@/pages/organisation/JobDetail';
import OrganisationSettings from '@/pages/organisation/Settings';
import BillingSubscription from '@/pages/organisation/BillingSubscription';
import ProfessionalDashboard from '@/pages/professional/Dashboard';
import Applications from '@/pages/professional/Applications';
import ProfessionalSubscription from '@/pages/professional/Subscription';
import ProfessionalSettings from '@/pages/professional/Settings';

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
  const { user, loading } = useAppSelector((state) => state.auth);
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    // Check auth immediately from localStorage (fastest check)
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      // If we have both token and user, we're authenticated
      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          // Verify it's an admin user
          if (parsedUser.userType === 'ADMIN') {
            setAuthChecked(true);
            setIsRehydrating(false);
            return;
          }
        } catch (e) {
          // Invalid user data, continue to check Redux
        }
      }
      
      // Also wait for Redux Persist to rehydrate
      const checkRehydration = () => {
        const state = store.getState();
        const isRehydrated = state.auth._persist?.rehydrated === true;
        
        if (isRehydrated) {
          setIsRehydrating(false);
          setAuthChecked(true);
        } else {
          // Check again after a short delay
          setTimeout(checkRehydration, 50);
        }
      };
      
      // Start checking rehydration
      checkRehydration();
      
      // Fallback timeout - stop checking after 2 seconds max
      const timeout = setTimeout(() => {
        setIsRehydrating(false);
        setAuthChecked(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    };
    
    checkAuth();
  }, []);

  // Show loading while checking auth state
  if (!authChecked || (loading && isRehydrating)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // Final auth check - prioritize localStorage (source of truth)
  let token: string | null = null;
  let userStr: string | null = null;
  let currentUser: any = null;
  
  try {
    // Always check localStorage first - it's the source of truth
    token = localStorage.getItem('token');
    userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch (e) {
        // Invalid JSON, fallback to Redux state
        currentUser = user;
      }
    } else if (user) {
      // Fallback to Redux state if localStorage is empty
      currentUser = user;
      token = 'present'; // Mark as present if user exists in Redux
    }
  } catch (error) {
    console.error('Error reading auth from localStorage:', error);
    // Fallback to Redux
    currentUser = user;
  }
  
  // Check if we have authentication
  // If we have a token in localStorage OR user in Redux, we're authenticated
  const hasToken = !!token || !!localStorage.getItem('token');
  const hasUser = !!userStr || !!user || !!currentUser;
  const hasAuth = hasToken && hasUser;
  
  // If no auth at all, redirect to login
  if (!hasAuth) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Verify user is admin - check both localStorage and Redux
  const userType = currentUser?.userType;
  if (currentUser && userType && userType !== 'ADMIN') {
    // Redirect based on user type
    if (userType === 'PROFESSIONAL') {
      return <Navigate to="/professional" replace />;
    } else if (userType === 'ORGANISATION') {
      return <Navigate to="/organization" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  
  // If we have token but can't verify user type yet, allow through
  // The API will handle auth errors if token is invalid
  // This prevents premature redirects during initial load
  
  return <>{children}</>;
}

function OrganisationRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppSelector((state) => state.auth);
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          if (parsedUser.userType === 'ORGANISATION') {
            setAuthChecked(true);
            setIsRehydrating(false);
            return;
          }
        } catch (e) {
          // Invalid user data
        }
      }
      
      const checkRehydration = () => {
        const state = store.getState();
        const isRehydrated = state.auth._persist?.rehydrated === true;
        
        if (isRehydrated) {
          setIsRehydrating(false);
          setAuthChecked(true);
        } else {
          setTimeout(checkRehydration, 50);
        }
      };
      
      checkRehydration();
      
      const timeout = setTimeout(() => {
        setIsRehydrating(false);
        setAuthChecked(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    };
    
    checkAuth();
  }, []);

  if (!authChecked || (loading && isRehydrating)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  let token: string | null = null;
  let userStr: string | null = null;
  let currentUser: any = null;
  
  try {
    token = localStorage.getItem('token');
    userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch (e) {
        currentUser = user;
      }
    } else if (user) {
      currentUser = user;
      token = 'present';
    }
  } catch (error) {
    console.error('Error reading auth from localStorage:', error);
    currentUser = user;
  }
  
  const hasToken = !!token || !!localStorage.getItem('token');
  const hasUser = !!userStr || !!user || !!currentUser;
  const hasAuth = hasToken && hasUser;
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  const userType = currentUser?.userType;
  if (currentUser && userType && userType !== 'ORGANISATION') {
    // Redirect based on user type
    if (userType === 'PROFESSIONAL') {
      return <Navigate to="/professional" replace />;
    } else if (userType === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function ProfessionalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppSelector((state) => state.auth);
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          if (parsedUser.userType === 'PROFESSIONAL') {
            setAuthChecked(true);
            setIsRehydrating(false);
            return;
          }
        } catch (e) {
          // Invalid user data
        }
      }
      
      const checkRehydration = () => {
        const state = store.getState();
        const isRehydrated = state.auth._persist?.rehydrated === true;
        
        if (isRehydrated) {
          setIsRehydrating(false);
          setAuthChecked(true);
        } else {
          setTimeout(checkRehydration, 50);
        }
      };
      
      checkRehydration();
      
      const timeout = setTimeout(() => {
        setIsRehydrating(false);
        setAuthChecked(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    };
    
    checkAuth();
  }, []);

  if (!authChecked || (loading && isRehydrating)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  let token: string | null = null;
  let userStr: string | null = null;
  let currentUser: any = null;
  
  try {
    token = localStorage.getItem('token');
    userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        currentUser = JSON.parse(userStr);
      } catch (e) {
        currentUser = user;
      }
    } else if (user) {
      currentUser = user;
      token = 'present';
    }
  } catch (error) {
    console.error('Error reading auth from localStorage:', error);
    currentUser = user;
  }
  
  const hasToken = !!token || !!localStorage.getItem('token');
  const hasUser = !!userStr || !!user || !!currentUser;
  const hasAuth = hasToken && hasUser;
  
  if (!hasAuth) {
    return <Navigate to="/login" replace />;
  }
  
  const userType = currentUser?.userType;
  if (currentUser && userType && userType !== 'PROFESSIONAL') {
    // Redirect based on user type
    if (userType === 'ORGANISATION') {
      return <Navigate to="/organization" replace />;
    } else if (userType === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/jobs" element={<JobsLanding />} />
      <Route path="/jobs/:id" element={<LandingJobDetail />} />
      <Route path="/professionals" element={<ProfessionalsLanding />} />
      <Route path="/professionals/:id" element={<ProfessionalDetail />} />
      <Route path="/organisations" element={<OrganisationsLanding />} />
      <Route path="/organisations/:id" element={<OrganisationDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Register />} />
      <Route path="/register-business" element={<RegisterBusiness />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/create-super-admin" element={<CreateSuperAdmin />} />
      <Route
        path="/admin"
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
            <AdminProfessionalDetail />
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
        path="/admin/registrations"
        element={
          <AdminRoute>
            <RegistrationsList />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/registrations/:id"
        element={
          <AdminRoute>
            <RegistrationDetail />
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
        path="/professional/setup"
        element={
          <ProtectedRoute>
            <ProfessionalSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/professional"
        element={
          <ProfessionalRoute>
            <ProfessionalDashboard />
          </ProfessionalRoute>
        }
      />
      <Route
        path="/professional/applications"
        element={
          <ProfessionalRoute>
            <Applications />
          </ProfessionalRoute>
        }
      />
      <Route
        path="/professional/subscription"
        element={
          <ProfessionalRoute>
            <ProfessionalSubscription />
          </ProfessionalRoute>
        }
      />
      <Route
        path="/professional/settings"
        element={
          <ProfessionalRoute>
            <ProfessionalSettings />
          </ProfessionalRoute>
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
        path="/app/jobs"
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
      <Route
        path="/organization"
        element={
          <OrganisationRoute>
            <OrganisationDashboard />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/professionals"
        element={
          <OrganisationRoute>
            <ViewProfessionals />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/professionals/:id"
        element={
          <OrganisationRoute>
            <OrganisationProfessionalDetail />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/jobs"
        element={
          <OrganisationRoute>
            <PostJobs />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/jobs/:id"
        element={
          <OrganisationRoute>
            <OrganisationJobDetail />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/settings"
        element={
          <OrganisationRoute>
            <OrganisationSettings />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/org-profile"
        element={
          <OrganisationRoute>
            <Navigate to="/organization/settings?tab=profile" replace />
          </OrganisationRoute>
        }
      />
      <Route
        path="/organization/billing"
        element={
          <OrganisationRoute>
            <BillingSubscription />
          </OrganisationRoute>
        }
      />
      {/* Redirect /organisation routes to /organization */}
      <Route path="/organisation" element={<Navigate to="/organization" replace />} />
      <Route path="/organisation/dashboard" element={<Navigate to="/organization" replace />} />
      <Route path="/organization/dashboard" element={<Navigate to="/organization" replace />} />
      <Route path="/organisation/professionals" element={<Navigate to="/organization/professionals" replace />} />
      <Route path="/organisation/jobs" element={<Navigate to="/organization/jobs" replace />} />
      <Route path="/organisation/org-profile" element={<Navigate to="/organization/settings?tab=profile" replace />} />
      <Route path="/organisation/settings" element={<Navigate to="/organization/settings" replace />} />
      <Route path="/organisation/billing" element={<Navigate to="/organization/billing" replace />} />
      <Route path="*" element={<NotFound />} />
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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;

