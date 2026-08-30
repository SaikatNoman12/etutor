import { httpService } from '../httpService';
import type { AxiosRequestConfig } from 'axios';

export function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return httpService.patch<T>(url, data, config);
}
