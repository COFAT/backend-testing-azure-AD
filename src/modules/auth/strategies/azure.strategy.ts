import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BearerStrategy } from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AzureAdStrategy extends PassportStrategy(BearerStrategy, 'azure-ad') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      // Required settings
      identityMetadata: `https://login.microsoftonline.com/${configService.get<string>('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
      clientID: configService.get<string>('AZURE_CLIENT_ID'),
      
      // Validation settings
      validateIssuer: true, // Set to false if you support multi-tenant
      passReqToCallback: false,
      loggingLevel: 'info', // 'error', 'warn', 'info'
      // scope: ['access_as_user'], // Optional: check for specific scopes
      
      // Audience validation - usually the Application ID URI
      // If your token audience is the client ID, use that.
      audience: configService.get<string>('AZURE_CLIENT_ID'), 
    });
  }

  async validate(profile: any) {
    // profile contains the decoded token claims
    // common fields: oid (Object ID), upn (User Principal Name), preferred_username, email, name
    
    if (!profile) {
      throw new UnauthorizedException('Invalid Azure AD token');
    }
    
    // Logic to match Azure AD user to your local database user
    // Usually by email or OID
    const user = await this.authService.validateAzureUser(profile);
    
    if (!user) {
      throw new UnauthorizedException('User not found in local system');
    }
    
    return user;
  }
}
