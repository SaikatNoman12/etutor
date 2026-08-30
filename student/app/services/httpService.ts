import axios from 'axios';
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse, ApiResponse } from '~/types/httpService';
import { createErrorResponse, handleAxiosError } from '~/utils/errorHandler';

class HttpService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      // Same-origin `/api` when VITE_API_URL is unset. It used to fall back to a hardcoded
      // a hardcoded dev host and port, which names a machine this app may not be served from
      // and a port it may not use, so the fallback could only ever be wrong when it fired.
      // A relative base is correct behind any reverse proxy and
      // is what a same-origin deployment wants; dev sets VITE_API_URL explicitly.
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
      // Auth is via httpOnly cookies (RULE-B7 + react.rules.md). The browser
      // attaches the cookie automatically when withCredentials is true; never
      // touch localStorage or Authorization headers — XSS-vulnerable.
      withCredentials: true,
    });

    // Request interceptor — no token injection. Cookies travel via the browser
    // because withCredentials=true. If you need to add request-scoped headers
    // (correlation id, locale), do it here.
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => config,
      (error: AxiosError) => Promise.reject(error),
    );

    // Response interceptor — handles 401 once via /auth/refresh, then retries
    // the original request. The `_retried` flag prevents infinite refresh loops
    // (RULE-I1).
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const original = error.config as
          (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
        const status = error.response?.status;

        if (
          status === 401 &&
          original &&
          !original._retried &&
          !original.url?.includes('/auth/refresh') &&
          !original.url?.includes('/auth/login') &&
          // on-load /auth/me probe 401s for guests — never refresh→redirect (auth-bootstrap-doctor)
          !original.url?.includes('/auth/me')
        ) {
          original._retried = true;
          try {
            await this.api.post('/auth/refresh');
            return this.api(original);
          } catch (_refreshErr) {
            // refresh failed — fall through to the error response below
          }
        }

        return Promise.reject(createErrorResponse(error));
      },
    );
  }

  /**
   * Extracts the data property from ResponsePayloadDto wrapper
   */
  private extractData<T>(responsePayload: ApiResponse<T>): T {
    return responsePayload.data as T;
  }

  // Enhanced error handling for HTTP methods
  public async get<T>(url: string, config?: AxiosRequestConfig<any>): Promise<T> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return this.extractData(response.data);
    } catch (error) {
      throw handleAxiosError(error);
    }
  }

  // Request bodies are `unknown`, not `any`: the wrapper only forwards them to Axios, so it has
  // no business asserting a shape, and `unknown` accepts every caller while stopping the value
  // from silently spreading `any` through whatever reads the response.
  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return this.extractData(response.data);
    } catch (error) {
      throw handleAxiosError(error);
    }
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return this.extractData(response.data);
    } catch (error) {
      throw handleAxiosError(error);
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig<any>): Promise<T> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return this.extractData(response.data);
    } catch (error) {
      throw handleAxiosError(error);
    }
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig<unknown>): Promise<T> {
    try {
      const response = await this.api.patch<ApiResponse<T>>(url, data, config);
      return this.extractData(response.data);
    } catch (error) {
      throw handleAxiosError(error);
    }
  }

  /**
   * Get full response payload when you need access to success, message, etc.
   */
  public async getFullResponse<T>(url: string, config?: AxiosRequestConfig<any>): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  }
}

export const httpService = new HttpService();