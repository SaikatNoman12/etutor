import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse, ErrorResponse } from '~/types/httpService';

export const createErrorResponse = (error: AxiosError<ApiErrorResponse>): ErrorResponse => {
  const errorResponse: ErrorResponse = {
    message: 'An unexpected error occurred',
    status: 500,
  };

  if (error.response) {
    errorResponse.status = error.response.status;
    errorResponse.message = error.response.data?.message || error.message;

    switch (error.response.status) {
      case 401:
        handleUnauthorized(error.config?.url);
        break;
      case 403:
        errorResponse.message = 'Access denied';
        break;
      case 404:
        errorResponse.message = 'Resource not found';
        break;
      case 422:
        errorResponse.message = 'Validation failed';
        break;
      case 500:
        errorResponse.message = 'Server error';
        break;
    }
  } else if (error.request) {
    errorResponse.message = 'No response from server';
    errorResponse.status = 503;
  }

  return errorResponse;
};

/**
 * Where a 401 sends the visitor.
 *
 * `/login` was hardcoded here, and it is a guess: this project's sign-in screens are
 * /signin (student) and /admin/login (admin), both declared in design/manifest.json.
 * The guess only looked right while a leftover template page happened to occupy /login;
 * once that page went, every 401 redirected to a route that does not exist and the app
 * showed its 404 instead of its login form. Set VITE_LOGIN_PATH per app.
 */
const LOGIN_PATH: string =
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_LOGIN_PATH) ||
  '/login';

export const handleUnauthorized = (url?: string): void => {
  if (typeof window === 'undefined') return;
  // Auth-infra URLs (esp. the on-load /auth/me probe) 401 by design for guests;
  // hard-redirecting on them loops forever (auth-bootstrap-doctor).
  if (url && /\/auth\/(me|refresh|login|signup)/.test(url)) return;
  if (window.location.pathname.startsWith(LOGIN_PATH)) return;
  window.location.href = LOGIN_PATH;
};

export const handleAxiosError = (error: unknown): ErrorResponse => {
  if (axios.isAxiosError(error)) {
    return error.response?.data || {
      message: error.message,
      status: error.response?.status || 500,
    };
  }
  return {
    message: 'An unexpected error occurred',
    status: 500,
  };
};