import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UploadModule } from '@modules/upload/upload.module';
import { JobApplicationsModule } from '@modules/job-applications/job-applications.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [UploadModule, JobApplicationsModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
