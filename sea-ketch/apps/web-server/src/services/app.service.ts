import { Injectable } from '@nestjs/common';

/**
 * @notice NestJS service providing general application-level responses.
 */
@Injectable()
export class AppService {
    /**
     * @notice Returns a greeting string.
     */
    public getHello(): string {
        return 'Hello from web-server!';
    }

    /**
     * @notice Returns the current health status of the application.
     */
    public getHealth(): { status: string } {
        return { status: 'ok' };
    }
}
