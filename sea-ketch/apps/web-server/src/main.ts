import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

require('dotenv').config();

const globalLogger = new Logger('GlobalErrorHandler');

process.on('uncaughtException', (error: Error) => {
    globalLogger.error('Uncaught Exception', error.stack);
});

process.on('unhandledRejection', (reason: unknown) => {
    globalLogger.error(
        'Unhandled Promise Rejection',
        reason instanceof Error ? reason.stack : reason
    );
});

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create<NestFastifyApplication>(
            AppModule,
            new FastifyAdapter()
        );

        app.useGlobalFilters(new GlobalExceptionFilter());

        const config = new DocumentBuilder()
            .setTitle('Web Server API')
            .setDescription('Zooper MCP Web Server')
            .setVersion('0.1.0')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api', app, document);

        const port = process.env.PORT ?? 3000;
        app.enableCors({
            origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: '*',
            credentials: true,
        });

        await app.listen(port, '0.0.0.0');
        logger.log(`Application is listening on port ${port}`);
        logger.log(`Swagger docs available at http://localhost:${port}/api`);
    } catch (error) {
        logger.error('Failed to bootstrap the application', (error as Error).stack);
    }
}

bootstrap().catch((error) => {
    globalLogger.error('Bootstrap failed', error);
});
