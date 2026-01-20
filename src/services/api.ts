import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5103',
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

// Add token to requests if available on initialization
const token = getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any;
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
      if (import.meta.env.DEV) {
        console.log(`[API] Adding token to ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else {
      // Remove authorization header if no token
      delete config.headers['Authorization'];
      delete (config.headers as any).Authorization;
      delete api.defaults.headers.common['Authorization'];
      
      if (import.meta.env.DEV) {
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath.startsWith('/admin');
      
      // Only clear and redirect if this is a real 401 (not a token expiration during initial load)
      // Check if we have a token - if we do, this is a real auth failure
      const token = getToken();
      
      if (token) {
        // Clear auth data on unauthorized
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch (e) {
          console.error('Error clearing localStorage:', e);
        }
        delete api.defaults.headers.common['Authorization'];
        
        // Redirect to appropriate login page based on route
        // Only redirect if not already on a login page and not during initial page load
        if (currentPath !== '/login' && currentPath !== '/admin/login' && currentPath !== '/') {
          // Use a small delay to avoid redirect loops
          setTimeout(() => {
            if (isAdminRoute) {
              window.location.href = '/admin/login';
            } else {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

