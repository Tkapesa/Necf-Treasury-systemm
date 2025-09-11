/**
 * Unit Tests for Login Component
 * 
 * Tests form validation, loading states, error handling, and user interactions.
 * Uses Vitest + Testing Library for comprehensive component testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../../pages/Auth/Login';
import { AuthProvider } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
  apiClient: {
    postForm: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

// Mock window.location for redirect testing
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Test wrapper component that provides AuthContext
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

describe('Login Component', () => {
  const user = userEvent.setup();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders login form with all required elements', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /church treasury login/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows password toggle button', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const passwordField = screen.getByPlaceholderText(/password/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // SVG button without text

      expect(passwordField).toHaveAttribute('type', 'password');
      
      // Click toggle to show password
      fireEvent.click(toggleButton);
      expect(passwordField).toHaveAttribute('type', 'text');
      
      // Click again to hide password
      fireEvent.click(toggleButton);
      expect(passwordField).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty fields', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      // Submit empty form
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short username', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameField, 'ab'); // Too short
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short password', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameField, 'testuser');
      await user.type(passwordField, '12345'); // Too short
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('clears validation errors when user types', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(usernameField, 'test');
      await waitFor(() => {
        expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid credentials', async () => {
      const mockResponse = {
        access_token: 'test-token',
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
      };

      vi.mocked(apiClient.postForm).mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameField, 'testuser');
      await user.type(passwordField, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(apiClient.postForm).toHaveBeenCalledWith('/auth/login', {
          username: 'testuser',
          password: 'password123',
        });
      });
    });

    it('shows loading state during submission', async () => {
      vi.mocked(apiClient.postForm).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameField, 'testuser');
      await user.type(passwordField, 'password123');
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(usernameField).toBeDisabled();
      expect(passwordField).toBeDisabled();
    });

    it('handles login failure and shows error message', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(apiClient.postForm).mockRejectedValue(mockError);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameField, 'testuser');
      await user.type(passwordField, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Form should be re-enabled after error
      expect(submitButton).not.toBeDisabled();
      expect(usernameField).not.toBeDisabled();
      expect(passwordField).not.toBeDisabled();
    });
  });

  describe('User Experience', () => {
    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab navigation
      await user.tab();
      expect(usernameField).toHaveFocus();

      await user.tab();
      expect(passwordField).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('submits form on Enter key press', async () => {
      const mockResponse = {
        access_token: 'test-token',
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
      };

      vi.mocked(apiClient.postForm).mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);

      await user.type(usernameField, 'testuser');
      await user.type(passwordField, 'password123');
      await user.keyboard('[Enter]');

      await waitFor(() => {
        expect(apiClient.postForm).toHaveBeenCalledWith('/auth/login', {
          username: 'testuser',
          password: 'password123',
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and structure', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const usernameField = screen.getByPlaceholderText(/username/i);
      const passwordField = screen.getByPlaceholderText(/password/i);

      expect(usernameField).toHaveAttribute('aria-required', 'true');
      expect(passwordField).toHaveAttribute('aria-required', 'true');
      
      // Check for proper labeling
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('shows error messages with proper ARIA attributes', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/username is required/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-red-600');
      });
    });
  });
});
