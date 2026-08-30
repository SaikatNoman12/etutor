/**
 * httpMethods barrel export — keeps domain services tidy:
 *
 *   import { get, post, put, patch, del } from '~/services/httpMethods';
 *
 * `delete` is a reserved word in JS so the verb is exported as `del`.
 */
export { get } from './get';
export { post } from './post';
export { put } from './put';
export { patch } from './patch';
export { del } from './del';
