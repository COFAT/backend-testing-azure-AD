import { Module } from '@nestjs/common';
import { TranslationsModule } from './translations/translations.module';
import { TestsModule } from './tests/tests.module';

/**
 * Root module for the logical-tests feature.
 * Aggregates all sub-modules: translations, tests, questions, attempts,
 * scoring, and realtime.
 *
 * Sub-modules are added incrementally as they are implemented.
 */
@Module({
  imports: [TranslationsModule, TestsModule],
})
export class LogicalTestsModule {}
