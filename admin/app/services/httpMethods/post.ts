import { httpService } from '../httpService';
import type { AxiosRequestConfig } from 'axios';

export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return httpService.post<T>(url, data, config);
}
