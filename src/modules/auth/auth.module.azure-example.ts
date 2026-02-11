// Example of how to update AuthModule to include Azure Strategy

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config'; // ConfigService is needed by AzureStrategy
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { AzureAdStrategy } from './strategies/azure.strategy'; // Import the new strategy
// ... other imports

@Module({
  imports: [
    // Update PassportModule to fallback to 'azure-ad' or keep 'jwt' as default but allow both.
    // If making Azure AD primary: defaultStrategy: 'azure-ad'
    PassportModule.register({ defaultStrategy: 'azure-ad' }),

    ConfigModule, // Ensure ConfigModule is imported
    // ... other imports
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    AzureAdStrategy, // Add the strategy to providers
    // JwtStrategy,  // Keep if supporting legacy local auth
  ],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
