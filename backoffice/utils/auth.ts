export const AUTH_TOKEN_KEY = 'centrika_admin_token';

export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
};

export const clearAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    // Parse JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    // Check if token is expired
    if (payload.exp && payload.exp < now) {
      clearAuthToken();
      return false;
    }

    // Check if it's an admin token
    if (!payload.adminId) {
      clearAuthToken();
      return false;
    }

    return true;
  } catch (error) {
    // Invalid token format
    clearAuthToken();
    return false;
  }
};

export const getTokenPayload = (): any | null => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    return null;
  }
};

export const redirectToLogin = (): void => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// API request helper with auth
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If unauthorized, clear token and redirect
  if (response.status === 401) {
    clearAuthToken();
    redirectToLogin();
  }

  return await response.json();
};

// Check if user has specific admin role
export const hasAdminRole = (requiredRole: string): boolean => {
  const payload = getTokenPayload();
  if (!payload) return false;

  return payload.role === requiredRole || payload.role === 'super_admin';
};

// Get current admin user info
export const getCurrentAdmin = (): { id: number; email: string; role: string } | null => {
  const payload = getTokenPayload();
  if (!payload) return null;

  return {
    id: payload.adminId,
    email: payload.email,
    role: payload.role,
  };
};
