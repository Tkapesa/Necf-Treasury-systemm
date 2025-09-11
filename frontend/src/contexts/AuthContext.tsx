import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { User, LoginResponse } from '../types/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          
          // Verify token and get user data
          const userData = await apiClient.get<User>('/auth/me');
          setUser(userData);
        }
      } catch (error: any) {
        console.error('Failed to initialize auth:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        setToken(null);
        setError(error.message || 'Authentication initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      const response = await apiClient.postForm<LoginResponse>('/auth/login', {
        username,
        password
      });
      
      console.log('Login response received:', response);
      
      // Set token and user state
      setToken(response.access_token);
      setUser(response.user);
      
      // Store token in localStorage for persistence
      localStorage.setItem('token', response.access_token);
      
      console.log('Authentication state updated - user:', response.user, 'token set:', !!response.access_token);
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Enhanced error handling for FastAPI validation errors
      let errorMessage = 'Login failed';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Handle FastAPI validation errors
        if (data.detail && Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => err.msg).join('. ');
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (error.message && error.message !== '[object Object]') {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout API
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state regardless of API call result
      setUser(null);
      setToken(null);
      setError(null);
      localStorage.removeItem('token');
      toast.success('Logged out successfully');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    token,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
