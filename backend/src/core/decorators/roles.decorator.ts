import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Mark a route with required roles.
 *
 * Accepts the NAME or the NUMBER, because RolesGuard canonicalises both before comparing
 * (see roles.guard.ts: the DB/JWT carry numeric roles while a route may name them). Typing
 * this `string[]` alone did not make the numeric form illegal — it made every call site that
 * used the enum write `user_role.ADMIN as unknown as string`, which is the same value with a
 * cast in front of it and one more unsafe cast against the architecture budget.
 *
 * Usage: @Roles('admin', 'manager') · @Roles('admin', user_role.ADMIN)
 */
export const Roles = (...roles: Array<string | number>) => SetMetadata(ROLES_KEY, roles);
