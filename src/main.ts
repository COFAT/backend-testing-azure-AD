import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger for all NestJS logs
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Get config service and reflector
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // ============================================================================
  // GLOBAL PIPES - Input Validation
  // ============================================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Error on unknown properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================================================
  // GLOBAL FILTERS - Error Handling (order matters: last registered = first executed)
  // ============================================================================
  // AllExceptionsFilter catches non-HTTP exceptions (database errors, etc.)
  app.useGlobalFilters(new AllExceptionsFilter());
  // HttpExceptionFilter catches HTTP exceptions and formats them
  app.useGlobalFilters(new HttpExceptionFilter());

  // ============================================================================
  // GLOBAL INTERCEPTORS - Response Transformation
  // ============================================================================
  // TransformInterceptor wraps all responses in standard format
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // ============================================================================
  // CORS Configuration
  // ============================================================================
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:4200'),
    credentials: true,
  });

  // ============================================================================
  // SWAGGER DOCUMENTATION
  // ============================================================================
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('COFAT Recruitment Platform API')
      .setDescription('Backend API for psychotechnical testing platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
    );
  }

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📦 Environment: ${nodeEnv}`);
  logger.log(`✅ Global pipes, filters, and interceptors registered`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
