# GitLab Integration for Elba Security

This integration connects GitLab with Elba Security to sync and manage user access.

## Features

- **User Synchronization**: Fetches active users from GitLab instance with pagination support
- **User Deactivation**: Deactivates users in GitLab when requested by Elba
- **Admin Verification**: Ensures authenticated user has admin privileges
- **OAuth2 Authentication**: Secure authentication via Nango

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
│   └── gitlab/
│       ├── users.ts            # GitLab API client for users
│       └── users.test.ts       # Tests for GitLab API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Required OAuth Scope

When configuring in Nango, use the following OAuth scope:

- **`api`** - Required for both reading users and deactivating them (admin operations)

## Environment Variables

```
ELBA_SOURCE_ID=          # Your Elba source ID
NANGO_INTEGRATION_ID=    # GitLab integration ID in Nango
NANGO_SECRET_KEY=        # Nango secret key
GITLAB_API_BASE_URL=     # GitLab instance URL (e.g., https://gitlab.com)
GITLAB_USERS_SYNC_CRON=  # Cron schedule for user sync (default: 0 0 * * *)
GITLAB_USERS_SYNC_BATCH_SIZE= # Number of users per page (default: 100)
```

## Implementation Details

### User Sync

- Fetches all active users from GitLab instance
- Filters out bot users and inactive users
- Marks admin users as non-suspendable
- Supports keyset-based pagination via Link headers

### User Deactivation

- Uses GitLab's `/api/v4/users/:id/deactivate` endpoint
- Requires admin privileges
- Handles cases where user is already deactivated or doesn't exist

### Error Handling

- `401 Unauthorized`: Invalid or expired access token
- `403 Forbidden`: User lacks admin privileges
- `404 Not Found`: User doesn't exist (treated as success)

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

- [GitLab Users API](https://docs.gitlab.com/api/users/)
- [GitLab User Moderation](https://docs.gitlab.com/administration/moderate_users/)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
