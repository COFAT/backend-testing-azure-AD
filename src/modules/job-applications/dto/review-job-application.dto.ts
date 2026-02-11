import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewDecision {
  approved = 'approved',
  rejected = 'rejected',
}

/**
 * DTO for reviewing (approving/rejecting) a job application
 * Used by psychologues or admins to process pending applications
 */
export class ReviewJobApplicationDto {
  @ApiProperty({
    enum: ReviewDecision,
    description: 'Review decision: approve or reject the application',
    example: ReviewDecision.approved,
  })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required when rejecting)',
    example: 'Position already filled',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
