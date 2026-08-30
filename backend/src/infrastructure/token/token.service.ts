import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { IJwtPayload } from '../../shared/interfaces';

@Injectable()
export class TokenService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    getAccessToken(payload: IJwtPayload, rememberMe?: boolean): string {
        const expiresIn = rememberMe
            ? this.configService.get<string>('authTokenExpiredTimeRememberMe')
            : this.configService.get<string>('authTokenExpiredTime');

        const expiresInNumber = Number(expiresIn);

        if (isNaN(expiresInNumber)) {
            throw new Error(
                `Invalid JWT expiry time: ${expiresIn}. Check AUTH_TOKEN_EXPIRE_TIME in your .env file.`,
            );
        }

        return this.jwtService.sign(payload, { expiresIn: expiresInNumber });
    }

    getRefreshToken(payload: IJwtPayload): string {
        const refreshExpiresIn = this.configService.get<string>(
            'authRefreshTokenExpiredTime',
        );
        const refreshExpiresInNumber = Number(refreshExpiresIn);

        if (isNaN(refreshExpiresInNumber)) {
            throw new Error(
                `Invalid JWT refresh expiry time: ${refreshExpiresIn}. Check AUTH_REFRESH_TOKEN_EXPIRE_TIME in your .env file.`,
            );
        }

        return this.jwtService.sign(payload, {
            expiresIn: refreshExpiresInNumber,
        });
    }

    verifyToken(token: string): boolean {
        try {
            this.jwtService.verify(token);
            return true;
        } catch (error) {
            // Narrow `unknown` — strict TS / useUnknownInCatchVariables.
            // Without this, TS18046 'error is of type unknown' (v35).
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired');
            }
            throw new UnauthorizedException('Invalid token');
        }
    }

    decodeToken(token: string): any {
        return this.jwtService.decode(token);
    }

    // Aliases used by scaffold-auth-module's auth.service.ts. Kept here so the
    // two templates stay in sync without renaming the original methods.
    signAccess(payload: IJwtPayload, rememberMe?: boolean): string {
        return this.getAccessToken(payload, rememberMe);
    }

    signRefresh(payload: IJwtPayload): string {
        return this.getRefreshToken(payload);
    }

    // Verifies a refresh token specifically. Same behavior as verifyToken but
    // returns the decoded payload (so callers can read payload.id) instead
    // of a boolean.
    verifyRefresh(token: string): IJwtPayload {
        try {
            return this.jwtService.verify<IJwtPayload>(token);
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Refresh token has expired');
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // No-op until a token blocklist is wired up. auth.service.logout() calls
    // this best-effort and swallows errors, so a no-op is safe.
    async revokeRefresh(_token: string): Promise<void> {
        return;
    }
}
