/**
 * get.ts — typed GET wrapper around httpService.
 *
 * Why a thin wrapper: keeps domain services (~/services/httpServices/*) free
 * of axios specifics, makes it easy to swap transport later, and ensures the
 * response is unwrapped from the server's ResponsePayloadDto envelope.
 */
import { httpService } from '../httpService';
import type { AxiosRequestConfig } from 'axios';

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return httpService.get<T>(url, config);
}
