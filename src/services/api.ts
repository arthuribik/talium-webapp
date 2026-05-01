import axios from 'axios';

// Type assertion for Vite's import.meta.env
const getEnvVar = (key: string, defaultValue: string): string => {
  try {
    return (import.meta as any).env?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

// Determine the API base URL
// In production, use the Render endpoint, otherwise use localhost or env variable
const getApiBaseURL = (): string => {
  const envUrl = getEnvVar('VITE_API_URL', '');
  if (envUrl) {
    return envUrl;
  }
  
  // Check if we're in production
  const isProduction = (import.meta as any).env?.MODE === 'production' || 
                       (import.meta as any).env?.PROD === true ||
                       window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    return 'https://taldium-engine.onrender.com';
  }
  
  return 'http://localhost:5103';
};

export const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Server: `ProfessionalController` @ `v1/professional` — create portfolio project */
export const apiProfessionalProjectCreateUrl = (professionalId: string) =>
  `/v1/professional/${encodeURIComponent(professionalId)}/project`;

/** Server: update or delete a single `ProfessionalProject` by id */
export const apiProfessionalProjectByIdUrl = (projectId: string) =>
  `/v1/professional/project/${encodeURIComponent(projectId)}`;

// Helper function to get token from localStorage
const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error reading token from localStorage:', error);
    return null;
  }
};

// Helper function to get refresh token from localStorage
const getRefreshToken = (): string | null => {
  try {
    return localStorage.getItem('refreshToken');
  } catch (error) {
    console.error('Error reading refreshToken from localStorage:', error);
    return null;
  }
};

// Decode JWT payload without verification (client-side expiry check only)
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp as number | undefined;
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

let refreshPromise: Promise<string | null> | null = null;

const doRefresh = (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken?.trim()) {
    return Promise.resolve(null);
  }
  refreshPromise = axios
    .post(getApiBaseURL() + '/v1/auth/refresh', { refreshToken }, { headers: { 'Content-Type': 'application/json' } })
    .then((res) => {
      refreshPromise = null;
      const data = res.data;
      if (data?.token) {
        try {
          localStorage.setItem('token', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          return data.token;
        } catch {
          return null;
        }
      }
      return null;
    })
    .catch(() => {
      refreshPromise = null;
      return null;
    });
  return refreshPromise;
};

const clearAuthAndLogout = (isAdminRoute: boolean) => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
  delete api.defaults.headers.common['Authorization'];
  const stillOnProtectedRoute =
    window.location.pathname.startsWith('/admin') ||
    window.location.pathname.startsWith('/organization') ||
    window.location.pathname.startsWith('/professional');
  if (stillOnProtectedRoute) {
    window.location.href = isAdminRoute ? '/admin/login' : '/login';
  }
};

// Add token to requests if available on initialization
// This ensures token is set BEFORE any route guards check
const initializeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (token && token.trim()) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.trim()}`;
    }
  } catch (e) {
    console.error('Error initializing token:', e);
  }
};

// Initialize immediately - this is critical for route guards
initializeToken();

// List of public endpoints that don't require authentication
// Auth endpoints are public for their supported methods; other public resources are GET-only.
const publicAuthEndpoints = [
  '/v1/auth/login',
  '/v1/auth/register',
  '/v1/auth/createbusiness',
  '/v1/auth/forgot-password',
  '/v1/auth/reset-password',
  '/v1/auth/verify-email',
  '/v1/auth/send-verification-code',
  '/v1/auth/registration',
];

const publicGetEndpoints = [
  '/v1/jobs', // GET list - for landing page (but GET /v1/jobs/:id sends token when logged in for hasApplied)
  '/v1/admin/professionals', // GET only - Public landing page endpoint
  '/v1/admin/organisations', // GET only - Public landing page endpoint
  '/v1/admin/jobs', // GET only - Public landing page endpoint
];

// GET /v1/jobs/:jobId should send token when user is logged in (so backend can return hasApplied)
const isSingleJobGet = (url: string | undefined, method?: string): boolean => {
  if (!url || method?.toUpperCase() !== 'GET') return false;
  const path = url.split('?')[0];
  return /\/v1\/jobs\/[^/]+$/.test(path);
};

// Check if an endpoint is public
const isPublicEndpoint = (url: string | undefined, method?: string): boolean => {
  if (!url) return false;
  if (isRefreshEndpoint(url)) return false;
  if (publicAuthEndpoints.some(endpoint => url.includes(endpoint))) return true;
  // Only GET requests are public for non-auth endpoints, all other methods require auth
  if (method && method.toUpperCase() !== 'GET') return false;
  // Single job GET: always send token when available (backend uses it for hasApplied)
  if (isSingleJobGet(url, method)) return false;
  return publicGetEndpoints.some(endpoint => url.includes(endpoint));
};

// Refresh endpoint must not send Bearer token (uses body refreshToken only)
const isRefreshEndpoint = (url: string | undefined): boolean => {
  return !!url && url.includes('/v1/auth/refresh');
};

// Request interceptor: add token; if token expired, refresh first or log out
api.interceptors.request.use(
  async (config) => {
    if (!config.headers) {
      config.headers = {} as any;
    }

    if (isRefreshEndpoint(config.url)) {
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      return config;
    }

    if (isPublicEndpoint(config.url, config.method)) {
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.log(`[API] Public endpoint - skipping auth for ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    }

    let token = getToken();
    if (token?.trim() && isTokenExpired(token)) {
      const newToken = await doRefresh();
      if (!newToken) {
        clearAuthAndLogout(window.location.pathname.startsWith('/admin'));
        return Promise.reject(new Error('Session expired'));
      }
      token = newToken;
    }

    if (token?.trim()) {
      const authValue = `Bearer ${token.trim()}`;
      config.headers['Authorization'] = authValue;
      (config.headers as any).Authorization = authValue;
      api.defaults.headers.common['Authorization'] = authValue;
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.log(`[API] Adding token to ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      delete api.defaults.headers.common['Authorization'];
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.warn(`[API] No token for ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
let redirectInProgress = false;
let last401Time = 0;
let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
let appInitialized = false;
let initializationTime = Date.now();
let lastLoginTime = 0;

// Mark app as initialized after 2 seconds (give time for route guards to check)
setTimeout(() => {
  appInitialized = true;
}, 2000);

// Track login time to prevent immediate redirects after login
export const setLoginTime = () => {
  lastLoginTime = Date.now();
};

// Expose setLoginTime globally so authSlice can call it
if (typeof window !== 'undefined') {
  (window as any).setLoginTime = setLoginTime;
}

api.interceptors.response.use(
  (response) => {
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
      redirectTimeout = null;
    }
    redirectInProgress = false;
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      const requestUrl = originalRequest?.url || '';
      if (isPublicEndpoint(requestUrl, originalRequest?.method)) {
        return Promise.reject(error);
      }

      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath.startsWith('/admin');
      const now = Date.now();
      const timeSinceInit = now - initializationTime;
      const timeSinceLogin = now - lastLoginTime;

      if (!appInitialized || timeSinceInit < 3000) {
        return Promise.reject(error);
      }
      if (timeSinceLogin > 0 && timeSinceLogin < 5000) {
        return Promise.reject(error);
      }
      if (currentPath === '/login' || currentPath === '/admin/login' || currentPath === '/') {
        return Promise.reject(error);
      }

      const refreshToken = getRefreshToken();

      // Try refresh once per failed request (avoid retry loop)
      if (refreshToken?.trim() && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await doRefresh();
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      }

      // No refresh token, refresh failed, or already retried: log out immediately
      if (redirectInProgress || (now - last401Time < 2000)) {
        return Promise.reject(error);
      }
      redirectInProgress = true;
      last401Time = now;
      clearAuthAndLogout(isAdminRoute);
    }
    return Promise.reject(error);
  }
);

