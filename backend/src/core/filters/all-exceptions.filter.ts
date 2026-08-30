import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Map a TypeORM QueryFailedError (or any error carrying a Postgres SQLSTATE)
 * to a proper 4xx instead of a blanket 500. Detected by duck-typing the
 * driver error's `.code` (SQLSTATE) so the filter needs no `typeorm` import.
 *
 * Why: a bad/missing foreign key or a malformed UUID otherwise surfaces as an
 * UNHANDLED QueryFailedError → 500. (SpoMatch live-repro: `POST /api/lessons`
 * with `instructorId:"test"` → `invalid input syntax for type uuid` (22P02);
 * with a non-existent UUID → FK violation (23503) — both returned 500 where the
 * client error should be a 400.) Per the backend rule "every endpoint must
 * handle 400", DB constraint failures are CLIENT errors, not server errors.
 */
function mapDbError(
    exception: unknown,
): { status: HttpStatus; message: string } | null {
    const code: string | undefined =
        (exception as any)?.code ?? (exception as any)?.driverError?.code;
    if (!code || typeof code !== 'string') return null;
    switch (code) {
        case '22P02': // invalid_text_representation (e.g. malformed uuid / int)
            return { status: HttpStatus.BAD_REQUEST, message: 'Invalid value format for one or more fields' };
        case '23502': // not_null_violation
            return { status: HttpStatus.BAD_REQUEST, message: 'A required field is missing' };
        case '23503': // foreign_key_violation
            return { status: HttpStatus.BAD_REQUEST, message: 'A referenced resource does not exist' };
        case '23505': // unique_violation
            return { status: HttpStatus.CONFLICT, message: 'A resource with these values already exists' };
        case '23514': // check_violation
            return { status: HttpStatus.BAD_REQUEST, message: 'A value violates a field constraint' };
        default:
            return null;
    }
}

/**
 * AllExceptionsFilter — catches ALL exceptions, including non-HTTP ones.
 * Use alongside HttpExceptionFilter for complete error coverage.
 *
 * Registration order in main.ts matters:
 *   app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const dbError = exception instanceof HttpException ? null : mapDbError(exception);

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : dbError
                    ? dbError.status
                    : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : dbError
                    ? dbError.message
                    : 'Internal server error';

        // Log the full stack trace for genuinely-unexpected (non-HTTP, non-DB-constraint)
        // exceptions. Mapped DB-constraint errors are client errors — log at warn, no stack.
        if (!(exception instanceof HttpException)) {
            if (dbError) {
                this.logger.warn(
                    `DB constraint → ${status} on ${request.method} ${request.url}: ${(exception as any)?.message ?? ''}`,
                );
            } else {
                this.logger.error(
                    `Unhandled exception on ${request.method} ${request.url}`,
                    exception instanceof Error ? exception.stack : String(exception),
                );
            }
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            data: null,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
