import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';

/**
 * @notice Global NestJS exception filter that normalizes all errors into a consistent JSON response.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly _logger = new Logger(GlobalExceptionFilter.name);

    /**
     * @notice Intercepts any thrown exception and writes a standardized error response.
     * @param exception The caught exception.
     * @param host Provides access to the underlying HTTP request/response objects.
     */
    public catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : 'Internal server error';

        this._logger.error(`HTTP ${status}: ${message}`, exception instanceof Error ? exception.stack : undefined);

        response.status(status).send({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
        });
    }
}
