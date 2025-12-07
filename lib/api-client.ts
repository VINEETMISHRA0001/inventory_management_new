import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';

/**
 * Creates and configures an axios instance with interceptors for global request/response handling.
 * Automatically includes auth tokens, handles errors, and manages loading states.
 */
class ApiClient {
  private client: AxiosInstance;
  private loadingCount = 0;
  private loadingListeners: Set<(loading: boolean) => void> = new Set();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        // Global loader disabled - never show overlay
        // const isMutation = ['post', 'put', 'patch', 'delete'].includes(
        //   config.method?.toLowerCase() || ''
        // );
        // if (isMutation) {
        //   this.setLoading(true);
        // }
        return config;
      },
      (error) => {
        // this.setLoading(false);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        // this.setLoading(false);
        return response;
      },
      async (error: AxiosError) => {
        // this.setLoading(false);

        if (error.response) {
          const status = error.response.status;

          if (status === 401) {
            if (typeof window !== 'undefined') {
              // Don't redirect if already on login page to prevent loops
              const currentPath = window.location.pathname;
              if (currentPath !== '/login' && !currentPath.startsWith('/login')) {
                // Only redirect if not already on a public page
                window.location.href = '/login';
              }
            }
          }

          const errorMessage =
            (error.response.data as { error?: string })?.error ||
            error.message ||
            'An error occurred';

          // For 401 errors, use a more specific error message
          const finalErrorMessage = status === 401 ? 'Unauthorized' : errorMessage;
          return Promise.reject(new Error(finalErrorMessage));
        }

        if (error.request) {
          return Promise.reject(new Error('Network error. Please check your connection.'));
        }

        return Promise.reject(error);
      }
    );
  }

  private setLoading(loading: boolean) {
    if (loading) {
      this.loadingCount++;
    } else {
      this.loadingCount = Math.max(0, this.loadingCount - 1);
    }

    const isLoading = this.loadingCount > 0;
    this.loadingListeners.forEach((listener) => listener(isLoading));
  }

  public onLoadingChange(listener: (loading: boolean) => void) {
    this.loadingListeners.add(listener);
    return () => {
      this.loadingListeners.delete(listener);
    };
  }

  public get isLoading() {
    return this.loadingCount > 0;
  }

  public get<T = unknown>(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  public post<T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  public put<T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  public patch<T = unknown>(url: string, data?: unknown, config?: InternalAxiosRequestConfig) {
    return this.client.patch<T>(url, data, config);
  }

  public delete<T = unknown>(url: string, config?: InternalAxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

