import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TranslationsModule } from '../translations/translations.module';

/**
 * Sub-module for logical test CRUD, score classifications,
 * and inline translation management.
 */
@Module({
  imports: [TranslationsModule],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
