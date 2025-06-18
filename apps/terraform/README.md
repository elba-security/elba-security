# Terraform Integration for Elba Security

This integration connects Terraform Cloud/Enterprise with Elba Security to provide user management and security capabilities.

## Features

- **User Synchronization**: Syncs organization members from Terraform to Elba
- **User Management**: Support for removing users from Terraform organizations
- **Authentication**: OAuth2 authentication via [Nango](https://nango.dev/)
- **Event-Driven Architecture**: Async event processing using [Inngest](https://www.inngest.com/)

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=            # Your Elba source ID
   NANGO_INTEGRATION_ID=      # Your Nango integration ID
   NANGO_SECRET_KEY=          # Your Nango secret key
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
│   └── terraform/
│       ├── users.ts            # Terraform API client implementation
│       └── users.test.ts       # Tests for API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Implementation Details

### Authentication

The integration uses OAuth2 authentication through Nango. Users authenticate with their Terraform Cloud account, and the integration receives an access token to make API calls.

### User Synchronization

The integration syncs organization members from Terraform to Elba:

1. Fetches all active organization memberships
2. Filters out service accounts and invited (pending) users
3. Maps membership data to Elba's user format
4. Uses organization membership IDs for user identification (enabling deletion)

### API Endpoints Used

- `GET /api/v2/account/details` - Get authenticated user and organization info
- `GET /api/v2/organizations/{org}/organization-memberships` - List organization members
- `DELETE /api/v2/organization-memberships/{id}` - Remove a user from the organization

### Environment Variables

- `ELBA_SOURCE_ID`: UUID for your Elba source
- `NANGO_INTEGRATION_ID`: Nango integration identifier
- `NANGO_SECRET_KEY`: Nango API secret key
- `TERRAFORM_API_BASE_URL`: Terraform API base URL (defaults to https://app.terraform.io)
- `TERRAFORM_USERS_SYNC_CRON`: Cron schedule for user sync (defaults to daily at midnight)
- `TERRAFORM_USERS_SYNC_BATCH_SIZE`: Number of users to fetch per page (defaults to 50)

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

- [Terraform Cloud API Documentation](https://developer.hashicorp.com/terraform/cloud-docs/api-docs)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
- [Inngest Documentation](https://www.inngest.com/docs)
