
// Add these methods to your existing AuthService class in src/modules/auth/auth.service.ts

/*
  // Import these at the top
  import { UserStatus } from '@prisma/client';
*/

  // ============================================================================
  // AZURE AD AUTHENTICATION
  // ============================================================================

  async validateAzureUser(azureProfile: any) {
    // Azure AD profile usually has 'preferred_username' or 'email' or 'upn'
    const email = azureProfile.preferred_username || azureProfile.email || azureProfile.upn;
    
    if (!email) {
      throw new UnauthorizedException('No email found in Azure AD token');
    }

    const normalizedEmail = email.toLowerCase();

    // 1. Try to find user by email
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. If user exists, update their details from Azure AD if needed (optional)
    if (user) {
        // Optional: Update name or other details if they changed in Azure
        /*
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                firstName: azureProfile.given_name || user.firstName,
                lastName: azureProfile.family_name || user.lastName,
            }
        });
        */
       
       if (user.status === UserStatus.suspended || user.status === UserStatus.inactive) {
         throw new UnauthorizedException('User account is suspended or inactive');
       }
       
       return user;
    }

    // 3. If user DOES NOT exist, you have two choices:
    //    Option A: Auto-provision (Create) the user
    //    Option B: Reject login (User must be invited/created by admin first)
    
    // OPTION A implementation (Auto-create):
    /*
    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: azureProfile.given_name || 'Azure',
        lastName: azureProfile.family_name || 'User',
        role: 'candidate', // Default role
        status: UserStatus.active,
        isEmailVerified: true, // Azure AD verified it
        // ... other required fields
      }
    });
    return newUser;
    */

    // OPTION B implementation (Reject):
    throw new UnauthorizedException(`User ${email} is not registered in the system.`);
  }
