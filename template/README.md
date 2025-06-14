# Elba Integration Template

This template provides a foundation for building integrations with Elba Security using the modern ElbaInngestClient pattern.

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
│   └── {{name}}/               # Your integration-specific code
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
    // Add your integration-specific variables here
    {{name}}_API_BASE_URL: z.string().url(),
    {{name}}_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    {{name}}_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
  })
  .parse(process.env);
```

### 2. Update Inngest Client

In `src/inngest/client.ts`:

1. Set the appropriate `nangoAuthType` ('OAUTH2', 'API_KEY', or 'BASIC')
2. Implement the user sync function
3. Implement the user delete function (if supported)
4. Implement the installation validation function

### 3. Implement API Connectors

In `src/connectors/{{name}}/users.ts`:

1. Define your API response schemas using Zod
2. Implement `getUsers()` with pagination support
3. Implement `deleteUser()` if your API supports it
4. Add proper error handling using `IntegrationError` and `IntegrationConnectionError`

### 4. Write Tests

Update `src/connectors/{{name}}/users.test.ts` with tests for your API implementation using MSW for mocking.

## Key Patterns

### Authentication

The integration uses Nango for authentication. Users will authenticate through Nango's UI, and your integration receives credentials via the `connection` object:

- OAuth2: `connection.credentials.access_token`
- API Key: `connection.credentials.apiKey`
- Basic Auth: `connection.credentials.username` and `connection.credentials.password`

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
