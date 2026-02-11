import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { TranslationsService } from './translations.service';
import { UpsertLanguageDto } from './dto';

@ApiTags('Logical Tests - Languages & Translations')
@ApiBearerAuth()
@Controller('logical-tests/languages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  // ============================================================================
  // LANGUAGE MANAGEMENT (Admin only)
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get all languages' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filter by active languages only (default: true)',
  })
  @Roles('admin', 'psychologue')
  async getLanguages(
    @Query('activeOnly', new ParseBoolPipe({ optional: true }))
    activeOnly?: boolean,
  ) {
    return this.translationsService.getLanguages(activeOnly ?? true);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update a language' })
  @Roles('admin')
  async upsertLanguage(@Body() dto: UpsertLanguageDto) {
    return this.translationsService.upsertLanguage(dto);
  }

  @Patch(':code/toggle-active')
  @ApiOperation({ summary: 'Toggle language active status' })
  @ApiParam({ name: 'code', description: 'Language code', example: 'en' })
  @Roles('admin')
  async toggleLanguageActive(@Param('code') code: string) {
    return this.translationsService.toggleLanguageActive(code);
  }
}
