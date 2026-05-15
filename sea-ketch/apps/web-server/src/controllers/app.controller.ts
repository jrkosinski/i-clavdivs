import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from '../services/app.service';

/**
 * @notice REST controller exposing general application endpoints.
 */
@ApiTags('app')
@Controller()
export class AppController {
    /**
     * @notice Constructs the AppController with the injected AppService.
     * @param _appService Service providing application-level responses.
     */
    public constructor(private readonly _appService: AppService) {}

    /**
     * @notice Returns a greeting string.
     */
    @Get()
    public getHello(): string {
        return this._appService.getHello();
    }

    /**
     * @notice Returns the current health status of the application.
     */
    @Get('health')
    public getHealth(): { status: string } {
        return this._appService.getHealth();
    }
}
