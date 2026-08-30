import { httpService } from '../httpService';
import type { AxiosRequestConfig } from 'axios';

export function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return httpService.put<T>(url, data, config);
}
