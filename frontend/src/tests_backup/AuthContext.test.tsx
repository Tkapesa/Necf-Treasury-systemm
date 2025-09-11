/**
 * Unit Tests for AuthContext
 * 
 * Tests authentication state management, login/logout functionality,
 * token handling, and context provider behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    postForm: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test wrapper component
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with correct default state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('attempts to restore authentication from localStorage', async () => {
      const mockToken = 'stored-token';
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      localStorageMock.getItem.mockReturnValue(mockToken);
      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('handles invalid stored token gracefully', async () => {
      const mockToken = 'invalid-token';
      localStorageMock.getItem.mockReturnValue(mockToken);
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.clearToken).toHaveBeenCalled();
    });
  });

  describe('Login Functionality', () => {
    it('successfully logs in user with valid credentials', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      const mockResponse = {
        access_token: 'new-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'admin' as const,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      vi.mocked(apiClient.postForm).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.error).toBeNull();
      expect(apiClient.setToken).toHaveBeenCalledWith('new-token');
      expect(apiClient.postForm).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    it('handles login failure with error message', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const mockError = new Error('Invalid credentials');
      vi.mocked(apiClient.postForm).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login(mockCredentials);
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('sets loading state during login', async () => {
      const mockCredentials = {
        username: 'testuser',
        password: 'password123',
      };

      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      vi.mocked(apiClient.postForm).mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start login
      act(() => {
        result.current.login(mockCredentials);
      });

      // Check loading state
      expect(result.current.isLoading).toBe(true);

      // Resolve login
      act(() => {
        resolveLogin!({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            role: 'admin',
            is_active: true,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Logout Functionality', () => {
    it('successfully logs out user', async () => {
      // First set up authenticated state
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      localStorageMock.getItem.mockReturnValue('existing-token');
      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Mock logout API call
      vi.mocked(apiClient.post).mockResolvedValue({});

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBeNull();
      expect(apiClient.clearToken).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {}, { requiresAuth: true });
    });

    it('handles logout API failure gracefully', async () => {
      // Set up authenticated state
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      localStorageMock.getItem.mockReturnValue('existing-token');
      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Mock logout API failure
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if API fails
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(apiClient.clearToken).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser Functionality', () => {
    it('fetches current user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let fetchedUser: any;
      await act(async () => {
        fetchedUser = await result.current.getCurrentUser();
      });

      expect(fetchedUser).toEqual(mockUser);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('handles getCurrentUser failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      let fetchedUser: any;
      await act(async () => {
        fetchedUser = await result.current.getCurrentUser();
      });

      expect(fetchedUser).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('clears error when clearError is called', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate login error
      vi.mocked(apiClient.postForm).mockRejectedValue(new Error('Login failed'));

      await expect(
        act(async () => {
          await result.current.login({ username: 'test', password: 'test' });
        })
      ).rejects.toThrow();

      expect(result.current.error).toBe('Login failed');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Context Requirements', () => {
    it('throws error when useAuth is used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
