/**
 * Centralized API & Authentication Client Configuration
 * Handles both local development (Express full-stack proxy)
 * and production GitHub Pages deployment (with deployed HTTPS backend).
 */

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * Checks whether the app is executing inside a GitHub Pages static host.
 */
export function isGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.pathname.startsWith('/M-POS-RWANDA')
  );
}

/**
 * Verifies if a valid backend endpoint is reachable or configured.
 */
export function isBackendConfigured(): boolean {
  // If running on GitHub Pages without a port and without VITE_API_BASE_URL configured,
  // relative /api calls would fail or return static index.html.
  if (isGitHubPagesHost() && !window.location.port && !API_BASE_URL) {
    return false;
  }
  return true;
}

/**
 * Returns the fully qualified URL for an API endpoint.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Executes a network fetch to the backend API with unified error handling.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!isBackendConfigured()) {
    throw new Error(
      'Authentication backend is not configured for this GitHub Pages deployment. Please set the VITE_API_BASE_URL environment variable to your deployed HTTPS API service.'
    );
  }

  const url = getApiUrl(path);
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('fresh_pos_token') : null;
  if (token && !options.headers?.hasOwnProperty('Authorization')) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new Error(`Unable to connect to authentication backend at ${url}: ${message}`);
  }
}
