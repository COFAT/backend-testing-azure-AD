import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SitesModule } from './modules/sites/sites.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { UploadModule } from './modules/upload/upload.module';
import { JobApplicationsModule } from './modules/job-applications/job-applications.module';
import { CandidaturesModule } from './modules/candidatures/candidatures.module';
import { LogicalTestsModule } from './modules/logical-tests/logical-tests.module';
import { PersonalityTestsModule } from './modules/personality-tests/personality-tests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // Pino Logger - Clean request logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            ignore: 'req,res,responseTime',
            messageFormat:
              '{req.method} {req.url} {res.statusCode} - {responseTime}ms',
          },
        },
      },
    }),

    // Global Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Prefer REDIS_URL (used in Docker) over individual host/port settings
        let redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          const redisHost = configService.get<string>(
            'REDIS_HOST',
            'localhost',
          );
          const redisPort = configService.get<number>('REDIS_PORT', 6379);
          const redisPassword = configService.get<string>('REDIS_PASSWORD');

          redisUrl = redisPassword
            ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
            : `redis://${redisHost}:${redisPort}`;
        }

        return {
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl),
            }),
          ],
        };
      },
    }),

    // Shared modules
    PrismaModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    SitesModule,
    DepartmentsModule,
    UploadModule,
    JobApplicationsModule,
    CandidaturesModule,
    LogicalTestsModule,
    PersonalityTestsModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
