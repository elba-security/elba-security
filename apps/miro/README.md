# Miro Integration for Elba Security

This integration connects Miro with Elba Security to sync and manage user access.

## Features

- **User Synchronization**: Automatically syncs Miro organization members to Elba
- **OAuth2 Authentication**: Secure authentication via Nango
- **Scheduled Syncs**: Configurable cron-based user synchronization

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=your-elba-source-id
   NANGO_INTEGRATION_ID=miro-sandbox
   NANGO_SECRET_KEY=your-nango-secret-key
   MIRO_API_BASE_URL=https://api.miro.com
   MIRO_USERS_SYNC_CRON="0 0 * * *"
   MIRO_USERS_SYNC_BATCH_SIZE=100
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

### Testing

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

## Architecture

This integration uses the modern ElbaInngestClient pattern for event-driven processing:

```
src/
├── app/
│   └── api/
│       └── inngest/
│           └── route.ts        # Inngest webhook handler
├── common/
│   └── env.ts                  # Environment variable validation
├── connectors/
│   └── miro/
│       ├── users.ts            # Miro API client implementation
│       └── users.test.ts       # Tests for API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Implementation Details

### User Synchronization

The integration syncs active Miro organization members to Elba:

- Fetches users from Miro's organization members endpoint
- Supports pagination for large organizations
- Maps Miro users to Elba's user format
- Provides user management URL for each user

### Authentication

Uses OAuth2 authentication through Nango:

- Users authenticate through Nango's UI
- Integration receives access tokens via connection object
- Token validation through Miro's OAuth token endpoint

### API Endpoints Used

- `GET /v1/oauth-token` - Retrieve organization information
- `GET /v2/orgs/{orgId}/members` - List organization members with pagination

### Error Handling

Uses standardized error types from `@elba-security/common`:

- `IntegrationError` - For general API errors
- `IntegrationConnectionError` - For authentication/connection errors

## Environment Variables

| Variable                     | Description                          | Default     |
| ---------------------------- | ------------------------------------ | ----------- |
| `ELBA_SOURCE_ID`             | Unique identifier for this source    | Required    |
| `NANGO_INTEGRATION_ID`       | Nango integration identifier         | Required    |
| `NANGO_SECRET_KEY`           | Nango API secret key                 | Required    |
| `MIRO_API_BASE_URL`          | Miro API base URL                    | Required    |
| `MIRO_USERS_SYNC_CRON`       | Cron expression for user sync        | `0 0 * * *` |
| `MIRO_USERS_SYNC_BATCH_SIZE` | Number of users to fetch per request | `100`       |

## Limitations

- User deletion is not supported by Miro's API - users can only be managed through the Miro dashboard
- Only active organization members are synced
- No support for suspending/unsuspending users

## Resources

- [Miro API Documentation](https://developers.miro.com/reference/api-reference)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
