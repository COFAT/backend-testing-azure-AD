import { Module } from '@nestjs/common';
import { PersonalityTestsController } from './personality-tests.controller';
import { PersonalityTestsService } from './personality-tests.service';

@Module({
  controllers: [PersonalityTestsController],
  providers: [PersonalityTestsService],
  exports: [PersonalityTestsService],
})
export class PersonalityTestsModule {}
