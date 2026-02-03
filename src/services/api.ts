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
    return 'https://talium-engine.onrender.com';
  }
  
  return 'http://localhost:5103';
};

export const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

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
// Reserved for future token refresh implementation
// @ts-ignore - Intentionally unused, reserved for future token refresh
const getRefreshToken = () => {
  try {
    return localStorage.getItem('refreshToken');
  } catch (error) {
    console.error('Error reading refreshToken from localStorage:', error);
    return null;
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
// Note: Only GET requests to these endpoints are public, POST/PUT/DELETE require auth
const publicGetEndpoints = [
  '/v1/jobs', // GET only - for landing page
  '/v1/auth/', // Auth endpoints
  '/v1/admin/professionals', // GET only - Public landing page endpoint
  '/v1/admin/organisations', // GET only - Public landing page endpoint
  '/v1/admin/jobs', // GET only - Public landing page endpoint
];

// Check if an endpoint is public (only for GET requests)
const isPublicEndpoint = (url: string | undefined, method?: string): boolean => {
  if (!url) return false;
  // Only GET requests are public, all other methods require auth
  if (method && method.toUpperCase() !== 'GET') {
    return false;
  }
  return publicGetEndpoints.some(endpoint => url.includes(endpoint));
};

// Request interceptor to add token to every request (except public endpoints)
api.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
    }
    
    // Skip adding auth header for public GET endpoints only
    if (isPublicEndpoint(config.url, config.method)) {
      // Remove authorization header for public endpoints
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.log(`[API] Public endpoint - skipping auth for ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    }
    
    // Get token from localStorage on every request to ensure it's up to date
    const token = getToken();
    
    if (token && token.trim()) {
      // Set Authorization header - ensure it's always set correctly
      const authValue = `Bearer ${token.trim()}`;
      config.headers['Authorization'] = authValue;
      // Also set it directly on the headers object
      (config.headers as any).Authorization = authValue;
      // Also ensure it's set in defaults for consistency
      api.defaults.headers.common['Authorization'] = authValue;
      
      // Debug in development
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.log(`[API] Adding token to ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      // Remove authorization header if no token
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      delete api.defaults.headers.common['Authorization'];
      
      if ((import.meta as any).env?.DEV || (import.meta as any).env?.MODE === 'development') {
        console.warn(`[API] No token found for ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
let redirectInProgress = false;
let last401Time = 0;
let redirectTimeout: ReturnType<typeof setTimeout> | null = null;
let appInitialized = false;
let initializationTime = Date.now();

// Mark app as initialized after 2 seconds (give time for route guards to check)
setTimeout(() => {
  appInitialized = true;
}, 2000);

api.interceptors.response.use(
  (response) => {
    // Clear any pending redirect on successful response
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
      redirectTimeout = null;
    }
    redirectInProgress = false;
    return response;
  },
  (error) => {
    // Only handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      
      // Skip redirect for public GET endpoints - they don't require auth
      if (isPublicEndpoint(requestUrl, error.config?.method)) {
        return Promise.reject(error);
      }
      
      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath.startsWith('/admin');
      const now = Date.now();
      const timeSinceInit = now - initializationTime;
      
      // NEVER redirect during initial app load (first 3 seconds)
      // This prevents redirects before route guards can check auth
      if (!appInitialized || timeSinceInit < 3000) {
        return Promise.reject(error);
      }
      
      // Skip redirect if already on login pages or home
      if (currentPath === '/login' || currentPath === '/admin/login' || currentPath === '/') {
        return Promise.reject(error);
      }
      
      // Prevent multiple redirects within 5 seconds
      if (redirectInProgress || (now - last401Time < 5000)) {
        return Promise.reject(error);
      }
      
      const token = getToken();
      
      // Only redirect if we have a token (meaning it was sent but rejected)
      // AND the request was NOT made during initial load
      // This indicates the token is invalid/expired, not just missing
      if (token && token.trim() && appInitialized && timeSinceInit > 3000) {
        // Cancel any pending redirect
        if (redirectTimeout) {
          clearTimeout(redirectTimeout);
        }
        
        redirectInProgress = true;
        last401Time = now;
        
        // Clear auth data on unauthorized
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }
        delete api.defaults.headers.common['Authorization'];
        
        // Use a delay to avoid redirect loops and allow other requests to complete
        redirectTimeout = setTimeout(() => {
          redirectInProgress = false;
          redirectTimeout = null;
          // Only redirect if we're still on a protected route
          const stillOnProtectedRoute = window.location.pathname.startsWith('/admin') || 
                                        window.location.pathname.startsWith('/organization') ||
                                        window.location.pathname.startsWith('/professional');
          if (stillOnProtectedRoute) {
            if (isAdminRoute) {
              window.location.href = '/admin/login';
            } else {
            window.location.href = '/login';
            }
          }
        }, 1000);
      }
      // If no token, just reject - let the route guard handle it
    }
    return Promise.reject(error);
  }
);

