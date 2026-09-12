import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Role } from '../types/index.ts';
import { authApi, getStoredToken, setStoredToken } from '../lib/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }, remember?: boolean) => Promise<User>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate user profile from backend on initial mount if token exists
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await authApi.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
        setToken(currentToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      return null;
    } catch (err) {
      console.warn('[AuthContext] Failed to hydrate session:', err);
      setUser(null);
      setToken(null);
      setStoredToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for auth expiration events emitted by api.ts refresh interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      setStoredToken(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [refreshUser]);

  const login = async (
    credentials: { email: string; password: string },
    remember = true
  ): Promise<User> => {
    const response = await authApi.login(credentials);
    const { user: authUser, accessToken } = response.data!;

    setStoredToken(accessToken, remember);
    setToken(accessToken);
    setUser(authUser);
    localStorage.setItem('user', JSON.stringify(authUser));

    return authUser;
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    role: Role;
  }): Promise<User> => {
    const response = await authApi.register(userData);
    const { user: authUser, accessToken } = response.data!;

    setStoredToken(accessToken, true);
    setToken(accessToken);
    setUser(authUser);
    localStorage.setItem('user', JSON.stringify(authUser));

    return authUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('[AuthContext] Logout failed on server:', err);
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
