/**
 * API Client with Firebase Authentication
 * Automatically attaches Firebase ID token to all requests
 */

import { auth } from './firebase';

export class ApiClient {
  /**
   * Make an authenticated API request
   * Automatically includes Firebase ID token in Authorization header
   */
  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Get Firebase ID token from current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const idToken = await user.getIdToken(true);

      // Prepare headers with authentication
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        ...options.headers,
      };

      // Make request
      const response = await fetch(endpoint, {
        ...options,
        headers,
      });

      // Handle response
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
        }));
        throw new Error(
          error.error || error.message || `HTTP ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  static async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export default ApiClient;
