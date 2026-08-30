import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requiredRoles) {
            return true; // No roles required — allow access
        }

                const { user } = context.switchToHttp().getRequest();

        // v114: reconcile role representations. The DB/JWT carry NUMERIC roles
        // (e.g. 0=foreign_worker) while @Roles() may use the NAME or the number.
        // Map every form to a canonical name before comparing.
        const ROLE_CANON: Record<string, string> = { "1": "student", "2": "instructor", "99": "admin", "student": "student", "instructor": "instructor", "admin": "admin" };
        const canon = (r: unknown): string => ROLE_CANON[String(r)] ?? String(r);
        const userForms: string[] = Array.isArray(user?.roles)
            ? (user.roles as unknown[]).map(canon)
            : [canon(user?.role)];
        return requiredRoles.some((role) => userForms.includes(canon(role)));
    }
}
