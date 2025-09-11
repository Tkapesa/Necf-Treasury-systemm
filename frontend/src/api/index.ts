/**
 * API Client entry point
 * Re-exports the main client with conditional logic handled inside
 */

// Use real API client instead of demo
export { apiClient, ApiClientError } from './client';
export type { ApiError } from './client';
