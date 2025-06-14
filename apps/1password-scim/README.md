# 1Password SCIM Integration for Elba Security

This integration syncs 1Password users to Elba Security using the 1Password SCIM API.

## Features

- **Authentication**: Flexible authentication support via [Nango](https://nango.dev/) (OAuth2, API Key, Basic Auth)
- **Event-Driven Architecture**: Async event processing using [Inngest](https://www.inngest.com/)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing**: Ready-to-use testing setup with Vitest and MSW

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=
   NANGO_INTEGRATION_ID=
   NANGO_SECRET_KEY=
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

### Testing Setup

1. The `.env.test` file contains default test values and is committed to the repository
2. For local test overrides:
   ```bash
   cp .env.test .env.test.local
   ```
3. Modify `.env.test.local` with your test-specific values (this file is git-ignored)
4. Run tests:
   ```bash
   pnpm test
   ```

## Project Structure

```
src/
├── app/
│   └── api/
│       └── inngest/
│           └── route.ts        # Inngest webhook handler
├── common/
│   └── env.ts                  # Environment variable validation
├── connectors/
│   └── 1password-scim/         # 1Password SCIM API connectors
│       ├── users.ts            # API client implementation
│       └── users.test.ts       # Tests for API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Implementation Guide

### 1. Configure Environment Variables

Update `src/common/env.ts` with your integration-specific environment variables:

```typescript
export const env = z
  .object({
    ELBA_SOURCE_ID: z.string().uuid(),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
    // 1Password SCIM specific variables
    ONEPASSWORD_SCIM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ONEPASSWORD_SCIM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
  })
  .parse(process.env);
```

### 2. Configure 1Password SCIM Bridge

1Password SCIM requires:

- A Business plan account
- An active SCIM Bridge deployment
- API key authentication (provided during SCIM Bridge setup)

The integration expects these connection parameters from Nango:

- `apiKey`: Your SCIM Bridge bearer token
- `scimBridgeUrl`: The URL of your SCIM Bridge (configured in Nango connection config)
- `webUrl`: Optional 1Password web URL for user links

### 3. API Implementation

The integration implements:

- **User Sync**: Fetches active users from 1Password SCIM API with pagination
- **User Delete**: Deactivates users using SCIM PATCH operation
- **Installation Validation**: Verifies API key and SCIM Bridge connectivity

SCIM endpoints used:

- `GET /scim/v2/Users` - List users with pagination
- `PATCH /scim/v2/Users/{userId}` - Deactivate users

### 4. Write Tests

Update `src/connectors/1password-scim/users.test.ts` with tests for your API implementation using MSW for mocking.

## Key Patterns

### Authentication

The integration uses Nango for authentication. Users will authenticate through Nango's UI, and your integration receives credentials via the `connection` object:

This integration uses API Key authentication:

- `connection.credentials.apiKey` - The SCIM Bridge bearer token
- `connection.connection_config.scimBridgeUrl` - The SCIM Bridge URL

### Error Handling

Use the standard error types from `@elba-security/common`:

```typescript
// For general API errors
throw new IntegrationError('Error message', { response });

// For authentication/connection errors
throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
```

### Event Processing

The ElbaInngestClient handles all event orchestration. You only need to implement:

1. **User Sync**: Fetch and transform users to Elba's format
2. **User Delete**: Remove/deactivate users in your system
3. **Installation Validation**: Verify the connection works

## Testing

Run the test suite:

```bash
pnpm test        # Run tests once
pnpm test:watch  # Run tests in watch mode
```

Run linting and type checking:

```bash
pnpm lint        # ESLint
pnpm type-check  # TypeScript compiler
```

## Deployment

The integration is deployed as a Next.js application. Ensure all environment variables are configured in your deployment platform.

## Resources

- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
- [Inngest Documentation](https://www.inngest.com/docs)
