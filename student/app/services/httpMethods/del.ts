/**
 * del.ts — typed DELETE wrapper. Named `del` because `delete` is a JS keyword
 * and can't be used as a function name. Domain services import it as
 *
 *   import { del } from '~/services/httpMethods/del';
 */
import { httpService } from '../httpService';
import type { AxiosRequestConfig } from 'axios';

export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return httpService.delete<T>(url, config);
}
