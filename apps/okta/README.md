# Okta Integration for Elba Security

This integration connects Okta with Elba Security to provide user management and third-party apps monitoring capabilities.

## Features

- **OAuth Authentication**: Pre-configured OAuth flow using [Nango](https://nango.dev/)
- **Event Handling**: Event-driven architecture using [Inngest](https://www.inngest.com/)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing**: Ready-to-use testing setup with Vitest
- **User Management**: Sync and manage Okta users
- **Third-Party Apps Monitoring**: Track OAuth grants and authorized applications

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_API_BASE_URL=
   ELBA_SOURCE_ID=
   ELBA_WEBHOOK_SECRET=
   NANGO_INTEGRATION_ID=
   NANGO_SECRET_KEY=
   ELBA_API_KEY=

   # Optional - defaults shown
   OKTA_USERS_SYNC_CRON=0 0 * * *
   OKTA_DELETE_USER_CONCURRENCY=5
   OKTA_USERS_SYNC_BATCH_SIZE=10
   THIRD_PARTY_APPS_SYNC_CRON=0 0 * * *
   THIRD_PARTY_APPS_CONCURRENCY=5
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
│       └── webhooks/
│           └── elba/
│               ├── installation/
│               │   └── validate/
│               │       ├── route.ts    # Installation validation webhook
│               │       └── service.ts  # Installation validation logic
│               ├── users/
│               │   └── delete-users/   # User deletion webhook
│               └── third-party-apps/
│                   ├── start-sync/     # Third-party apps sync webhook
│                   ├── refresh-object/ # Refresh specific app webhook
│                   └── delete-object/  # Delete app authorization webhook
├── common/
│   ├── env.ts          # Environment configuration
│   └── nango.ts        # Nango client configuration
├── connectors/
│   ├── common/
│   │   ├── error.ts    # Error mapping utilities
│   │   ├── nango.ts    # Nango connection config
│   │   └── pagination.ts # Pagination utilities
│   ├── elba/
│   │   └── client.ts   # Elba client utilities
│   └── okta/           # Okta-specific code
│       ├── users.ts    # User API calls and types
│       ├── third-party-apps.ts # Third-party apps API calls
│       └── third-party-apps-transformer.ts # Transform grants to Elba format
└── inngest/
    ├── client.ts       # Inngest client configuration
    └── functions/      # Event handlers
        ├── users/      # User synchronization functions
        └── third-party-apps/ # Third-party apps functions
            ├── sync-third-party-apps.ts
            ├── refresh-third-party-app.ts
            ├── delete-third-party-app.ts
            └── schedule-third-party-apps-syncs.ts
```

## Key Features

### Installation Validation

The integration includes a webhook-based installation flow that:

1. Validates the Nango connection
2. Verifies access to the Okta API
3. Triggers initial sync for both users and third-party apps

### User Management

- Syncs active users from Okta
- Supports user deletion
- Marks the authenticated user as non-suspendable
- Scheduled syncs via cron

### Third-Party Apps Monitoring

- Fetches OAuth grants for all users
- Groups grants by application
- Tracks authorized scopes per user
- Supports grant revocation
- Scheduled syncs via cron

### Error Handling

Built-in error management features:

- Automatic mapping of common errors (401, 403, etc.)
- Connection status updates
- Error logging and serialization
- Rate limiting protection

## Development

1. Add your source-specific validation logic in `src/app/api/webhooks/elba/installation/validate/service.ts`
2. Implement your resource sync handlers
3. Add any additional webhooks needed for your integration

## Environment Files

The template uses several environment files for different purposes:

- `.env.local.example` → `.env.local`: Development environment variables
- `.env.test`: Default test values (committed to repo)
- `.env.test.local`: Local test overrides (git-ignored)

This pattern ensures:

- Consistent test values across the team
- Easy local development setup
- Safe local overrides without affecting the repository

## Authentication & Installation Flow

The authentication flow happens entirely in Elba's SaaS platform. Once completed:

1. Elba calls the integration's webhook endpoint `/api/webhooks/elba/installation/validate`
2. The integration performs additional checks (e.g., verifying admin permissions)
3. If validation succeeds, initial sync events are triggered

For implementation details, see `src/app/api/webhooks/elba/installation/validate/`.

## Event Types

The template includes the following Inngest events:

```typescript
'okta/app.installed': {
  data: {
    organisationId: string;
  }
}

'okta/app.uninstalled': {
  data: {
    organisationId: string;
    region: string;
    errorType: ConnectionErrorType;
    errorMetadata?: unknown;
  }
}

'okta/users.sync.requested': {
  data: {
    organisationId: string;
    region: string;
    nangoConnectionId: string;
    isFirstSync: boolean;
    syncStartedAt: number;
    page: string | null;
  }
}

'okta/third_party_apps.sync.requested': {
  data: {
    organisationId: string;
    region: string;
    nangoConnectionId: string;
    isFirstSync: boolean;
    syncStartedAt: string;
  }
}

'okta/third_party_apps.refresh.requested': {
  data: {
    organisationId: string;
    region: string;
    nangoConnectionId: string;
    appId: string;
    userId: string;
  }
}

'okta/third_party_apps.delete.requested': {
  data: {
    organisationId: string;
    region: string;
    nangoConnectionId: string;
    appId: string;
    userId: string;
  }
}
```

## Error Handling

The template includes built-in error handling for:

- OAuth authentication failures
- Rate limiting (via middleware)
- Connection errors (unauthorized, not admin)
- API errors with proper error mapping

## Contributing

Please refer to the main repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
