# Jira Integration for Elba Security

This integration connects Jira with Elba Security for user management and access control.

## Features

- **Authentication**: OAuth 2.0 (3LO) authentication via [Nango](https://nango.dev/)
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
│   └── jira/                   # Jira-specific API connectors
│       ├── users.ts            # API client implementation
│       └── users.test.ts       # Tests for API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Jira Integration Details

### Authentication

The Jira integration uses OAuth 2.0 (3LO) authentication with the following required scopes:

- `read:jira-user` - Read user information
- `offline_access` - Maintain access when user is offline

### Supported Features

1. **User Synchronization**: Fetches all active Atlassian users from your Jira instance
2. **User Deletion**: Removes users from Jira when requested by Elba
3. **Installation Validation**: Verifies OAuth token validity

### API Implementation

The integration uses Jira REST API v3 endpoints:

- `/rest/api/3/users/search` - List users with pagination
- `/rest/api/3/user` - Delete individual users
- `/rest/api/3/myself` - Get authenticated user information

## Key Patterns

### Connection Configuration

The integration receives the Jira domain from Nango's connection config:

- `connection.connection_config.siteUrl` - The Jira instance URL (e.g., `https://mycompany.atlassian.net`)
- `connection.credentials.access_token` - OAuth 2.0 access token

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

1. **User Sync**: Fetches active Atlassian users and syncs them to Elba
2. **User Delete**: Deletes users from Jira using their account ID
3. **Installation Validation**: Verifies OAuth token by fetching authenticated user info

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
- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
