import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, map, Observable, throwError } from "rxjs";
import { authCookieOptions } from "../utils/auth-cookie.options";

/**
 * SetTokenInterceptor — automatically sets httpOnly cookies when the service
 * returns a response containing a token.
 *
 * Usage: @UseInterceptors(SetTokenInterceptor) on login/register/refresh endpoints.
 *
 * The service must return: { success: true, data: { token: '...' } }
 * or the interceptor will pass the response through unchanged.
 */
@Injectable()
export class SetTokenInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((value) => {
        // v156: tolerate BOTH response shapes (the raw service dto at method-
        // interceptor time, OR a {success,data} envelope) AND common token field
        // names (token | accessToken). The previous strict `value.success &&
        // value.data.token` set NO cookie when the auth service returned
        // { user, accessToken, refreshToken } (SpoMatch v156) → login 200 but no
        // Set-Cookie → every authenticated request 401 → test-browser auth dead.
        const payload = value?.data ?? value ?? {};
        const accessToken = payload.token ?? payload.accessToken;
        const refreshToken = payload.refreshToken ?? payload.refresh_token;
        if (accessToken) {
          res.cookie(
            this.configService.getOrThrow<string>("AUTH_TOKEN_COOKIE_NAME"),
            accessToken,
            authCookieOptions(this.configService),
          );
        }

        if (refreshToken) {
          res.cookie(
            this.configService.getOrThrow<string>(
              "AUTH_REFRESH_TOKEN_COOKIE_NAME",
            ),
            refreshToken,
            authCookieOptions(this.configService),
          );
        }

        return value;
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }
}
