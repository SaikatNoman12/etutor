import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse = exception.getResponse();

        let message: string | string[];
        // Per-field detail, when the thrower supplied it. The validation pipe
        // answers `{ message, errors: { email: '…' } }` so a form can mark the
        // input the person has to go back to; this filter used to read
        // `message` and drop everything else, which left the client with one
        // sentence and no idea which box it was about.
        let errors: Record<string, string> | undefined;
        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (
            typeof exceptionResponse === 'object' &&
            'message' in exceptionResponse
        ) {
            message = (exceptionResponse as any).message;
            const maybe = (exceptionResponse as any).errors;
            // Only when there is something in it. An empty `errors: {}` tells a
            // client there is per-field detail and then gives none.
            if (maybe && typeof maybe === 'object' && !Array.isArray(maybe) && Object.keys(maybe).length) {
                errors = maybe as Record<string, string>;
            }
        } else {
            message = exception.message;
        }

        // A 404 from the router itself reads "Cannot GET /api/x" — the method
        // and the path, to someone who typed neither.
        if (status === 404 && typeof message === 'string' && /^Cannot (GET|POST|PUT|PATCH|DELETE) /.test(message)) {
            message = 'That page could not be found.';
        }

        this.logger.warn(
            `${request.method} ${request.url} ${status} — ${JSON.stringify(message)}`,
        );

        response.status(status).json({
            success: false,
            statusCode: status,
            message,
            ...(errors ? { errors } : {}),
            data: null,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
