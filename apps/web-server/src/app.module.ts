import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { AgentController } from './controllers/agent.controller';
import { AgentService } from './services/agent.service';

/** @notice Root NestJS application module. */
@Module({
    imports: [],
    controllers: [AppController, AgentController],
    providers: [AppService, AgentService],
})
export class AppModule {}
