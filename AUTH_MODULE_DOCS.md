# COFAT Backend - Authentication Module Documentation

This document provides an overview of the Authentication Module structure to facilitate the review and integration of Azure AD (Entra ID).

## 📂 Module Structure (`src/modules/auth/`)

The authentication logic is encapsulated within the `AuthModule`. Below is the file structure with descriptions of each component's responsibility.

```text
src/modules/auth/
├── controllers/
│   └── auth.controller.ts       # API Endpoints (Login, Register, Refresh Token)
│
├── decorators/                  # Custom Decorators
│   └── current-user.decorator.ts # Extracts user from request object
│
├── dto/                         # Data Transfer Objects (Validation)
│   └── auth.dto.ts              # LoginDto, RegisterDto validation schemas
│
├── guards/                      # Route Guards
│   ├── jwt-auth.guard.ts        # Protects routes requiring valid JWT
│   └── roles.guard.ts           # RBAC (Role-Based Access Control)
│
├── services/                    # Business Logic
│   ├── otp.service.ts           # Handling OTP generation/validation
│   └── auth-azure-extension.ts  # [NEW] Proposed Azure AD validation logic
│
├── strategies/                  # Passport.js Strategies
│   ├── jwt.strategy.ts          # Core JWT Strategy (Local Auth)
│   ├── jwt-refresh.strategy.ts  # Refresh Token Strategy
│   └── azure.strategy.ts        # [NEW] Azure AD Bearer Strategy implementation
│
├── auth.module.ts               # Module Definition & Dependency Injection
├── auth.service.ts              # Core Auth Logic (Validate User, Generate Tokens)
└── auth.module.azure-example.ts # [NEW] Example of how to register Azure Strategy
```

## 🔐 Current Authentication Architecture

The current system uses **Passport.js** with **JWT (JSON Web Tokens)**.

1.  **Local Login**: Users login with `email` + `password`.
2.  **Token Generation**: `AuthService` generates an `Access Token` (short-lived) and `Refresh Token` (long-lived).
3.  **Protection**: Protected routes use `JwtAuthGuard` which invokes `JwtStrategy`.

## ☁️ Azure AD Integration Points

We have prepared placeholder files to demonstrate where the Azure AD integration will fit:

1.  **Strategy**: `src/modules/auth/strategies/azure.strategy.ts`
    - Implements `passport-azure-ad` `BearerStrategy`.
    - Validates the token signature issued by Microsoft Entra ID.

2.  **Service Logic**: `src/modules/auth/services/auth-azure-extension.ts`
    - Contains the `validateAzureUser` method.
    - Matches the Azure AD user (via email/UPN) to the local PostgreSQL database.

3.  **Configuration**: `.env.azure-example`
    - Contains the required `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`.

## 🚀 Next Steps for Integration

To finalize the integration, the following changes will be applied:

1.  **Install dependencies**: `npm install passport-azure-ad`.
2.  **Register Strategy**: specific provider registration in `auth.module.ts`.
3.  **Update Guard**: Update or create a new Guard to accept both `jwt` (local) and `azure-ad` tokens, or switch primarily to Azure AD.
