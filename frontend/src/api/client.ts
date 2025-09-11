/**
 * HTTP API Client with centralized error handling and JWT token injection
 * 
 * In a production application, JWT tokens should be stored in HttpOnly cookies
 * and managed by the backend to prevent XSS attacks. This implementation uses
 * localStorage for development purposes but includes comments about proper security.
 */

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class ApiClientError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeout?: number;
  skipContentType?: boolean;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 10000;

  constructor(baseURL: string = 'http://localhost:8000/api/v1') {
    this.baseURL = baseURL;
  }

  /**
   * Get JWT token from storage
   * 
   * SECURITY NOTE: In production, this should retrieve the token from an HttpOnly cookie
   * via a backend endpoint like GET /auth/token-status, not from localStorage.
   * HttpOnly cookies cannot be accessed by JavaScript, preventing XSS token theft.
   */
  private getToken(): string | null {
    // TODO: Replace with secure cookie-based token retrieval
    // Example: await fetch('/auth/token-status', { credentials: 'include' })
    return localStorage.getItem('token');
  }

  /**
   * Store JWT token
   * 
   * SECURITY NOTE: In production, tokens should be set as HttpOnly cookies by the backend
   * during login response. The frontend would not handle token storage directly.
   */
  public setToken(token: string): void {
    // TODO: Replace with backend cookie setting via Set-Cookie header
    localStorage.setItem('token', token);
  }

  /**
   * Remove JWT token
   * 
   * SECURITY NOTE: In production, this would call a logout endpoint that clears
   * the HttpOnly cookie via Set-Cookie header with expiration in the past.
   */
  public clearToken(): void {
    // TODO: Replace with backend logout endpoint that clears cookies
    localStorage.removeItem('token');
  }

  /**
   * Create request headers with authentication if required
   */
  private createHeaders(options: RequestOptions = {}, skipContentType = false): HeadersInit {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only set Content-Type if not skipped (for FormData uploads)
    if (!skipContentType) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header if token exists and auth is required
    if (options.requiresAuth !== false) {
      const token = this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response and extract errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    let data: any;
    
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      // Enhanced error handling for FastAPI validation errors
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      if (data?.detail) {
        // Handle FastAPI validation errors (array format)
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => err.msg || err.message || String(err)).join('. ');
        } else if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else {
          errorMessage = String(data.detail);
        }
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (data?.error) {
        errorMessage = data.error;
      }

      const apiError: ApiError = {
        message: errorMessage,
        status: response.status,
        code: data?.code,
        details: data,
      };

      // Handle authentication errors
      if (response.status === 401) {
        this.clearToken();
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      throw new ApiClientError(apiError);
    }

    return data;
  }

  /**
   * Create AbortController for request timeout
   */
  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  /**
   * Generic request method with error handling and timeout
   */
  private async request<T>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      requiresAuth = true,
      skipContentType = false,
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const controller = this.createAbortController(timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: this.createHeaders({ ...options, requiresAuth }, skipContentType),
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError({
          message: 'Request timeout',
          status: 408,
          code: 'TIMEOUT',
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Network error';
      throw new ApiClientError({
        message: errorMessage,
        status: 0,
        code: 'NETWORK_ERROR',
        details: error,
      });
    }
  }

  /**
   * HTTP GET request
   */
  public async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * HTTP POST request
   */
  public async post<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data : JSON.stringify(data);
    const headers = isFormData ? {} : options?.headers;

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
      headers,
      skipContentType: isFormData,
    });
  }

  /**
   * HTTP PUT request
   */
  public async put<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * HTTP PATCH request
   */
  public async patch<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * HTTP DELETE request
   */
  public async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Form data POST (for OAuth2 login)
   */
  public async postForm<T>(
    endpoint: string,
    data: Record<string, string>,
    options?: RequestOptions
  ): Promise<T> {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      skipContentType: true, // Let us set our own Content-Type
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(options?.headers as Record<string, string>),
      },
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
);

export default apiClient;
