import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, map, Observable, throwError } from "rxjs";
import { authCookieOptions } from "../utils/auth-cookie.options";

/**
 * RemoveTokenInterceptor — clears httpOnly auth cookies on logout.
 *
 * Usage: @UseInterceptors(RemoveTokenInterceptor) on the logout endpoint.
 *
 * Sets both access and refresh token cookies to empty strings,
 * and strips sensitive data from the response.
 */
@Injectable()
export class RemoveTokenInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    // Clear on SUCCESS, where success means the handler completed — not a
    // `success: true` field in the body.
    //
    // The logout route answers 204 No Content and returns void, so `value` here
    // is undefined, `value?.success` was never true, and the two res.cookie()
    // calls below never ran. Logout revoked the refresh token, sent 204 with no
    // Set-Cookie at all, and the browser kept both cookies: the very next
    // GET /auth/me answered 200 and the header still said "Sign out". The
    // person had signed out; the site had not.
    const clear = () => {
      const opts = { ...authCookieOptions(this.configService), maxAge: 0 };
      res.cookie(this.configService.getOrThrow<string>("AUTH_TOKEN_COOKIE_NAME"), "", opts);
      res.cookie(this.configService.getOrThrow<string>("AUTH_REFRESH_TOKEN_COOKIE_NAME"), "", opts);
    };

    return next.handle().pipe(
      map((value) => {
        clear();
        if (value && typeof value === "object" && "success" in value) {
          // Strip sensitive data — only return success + message
          return { success: true, message: (value as { message?: string }).message || "Logged out successfully" };
        }
        return value;
      }),
      catchError((err) => throwError(() => err)),
    );
  }
}
