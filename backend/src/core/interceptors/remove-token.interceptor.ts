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

    return next.handle().pipe(
      map((value) => {
        if (value?.success) {
          // Clear access token cookie
          res.cookie(
            this.configService.getOrThrow<string>("AUTH_TOKEN_COOKIE_NAME"),
            "",
            // The identical attributes the cookie was SET with. A cross-site response
            // clearing it without SameSite=None; Secure is rejected by the browser, so
            // the old cookie survives and logout does not log anyone out.
            { ...authCookieOptions(this.configService), maxAge: 0 },
          );

          // Clear refresh token cookie
          res.cookie(
            this.configService.getOrThrow<string>(
              "AUTH_REFRESH_TOKEN_COOKIE_NAME",
            ),
            "",
            // The identical attributes the cookie was SET with. A cross-site response
            // clearing it without SameSite=None; Secure is rejected by the browser, so
            // the old cookie survives and logout does not log anyone out.
            { ...authCookieOptions(this.configService), maxAge: 0 },
          );

          // Strip sensitive data — only return success + message
          return {
            success: true,
            message: value.message || "Logged out successfully",
          };
        }

        return value;
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }
}
