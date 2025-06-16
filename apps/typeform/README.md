# Typeform Integration for Elba

This integration enables Elba to perform access reviews for Typeform by synchronizing workspace members and their roles.

## Features

- **Workspace-Based User Sync**: Iterates through all Typeform workspaces to collect members
- **Multi-Region Support**: Handles both US and EU data centers
- **Rate Limiting**: Respects Typeform's 2 requests/second API limit
- **User Management**: Supports user deletion across all workspaces
- **Role-Based Permissions**: Identifies workspace owners as non-suspendable

## Architecture Overview

### User Synchronization Strategy

Typeform doesn't provide a direct user list API. Instead, this integration:

1. Fetches all workspaces using pagination
2. For each workspace, retrieves member details
3. Aggregates members across all workspaces
4. Implements custom pagination to handle batch size limits

### Rate Limiting

The integration includes a rate limiter that ensures compliance with Typeform's 2 requests/second limit across all API calls.

### EU Data Center Support

The integration detects the region from the connection metadata and routes requests to the appropriate API endpoint:

- US: `https://api.typeform.com`
- EU: `https://api.eu.typeform.com`

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=your-source-id
   NANGO_INTEGRATION_ID=typeform-integration-id
   NANGO_SECRET_KEY=your-nango-secret
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

1. The `.env.test` file contains default test values
2. Run tests:
   ```bash
   pnpm test
   ```

## Environment Variables

| Variable                         | Description                    | Default                       |
| -------------------------------- | ------------------------------ | ----------------------------- |
| `ELBA_SOURCE_ID`                 | Elba source identifier         | Required                      |
| `NANGO_INTEGRATION_ID`           | Nango integration ID           | Required                      |
| `NANGO_SECRET_KEY`               | Nango secret key               | Required                      |
| `TYPEFORM_API_BASE_URL`          | US API base URL                | `https://api.typeform.com`    |
| `TYPEFORM_EU_API_BASE_URL`       | EU API base URL                | `https://api.eu.typeform.com` |
| `TYPEFORM_USERS_SYNC_CRON`       | Cron schedule for user sync    | `0 0 * * *`                   |
| `TYPEFORM_USERS_SYNC_BATCH_SIZE` | Number of users per sync batch | `20`                          |
| `TYPEFORM_API_RATE_LIMIT`        | Requests per second            | `2`                           |

## Project Structure

```
src/
├── app/
│   └── api/
│       └── inngest/
│           └── route.ts            # Inngest webhook handler
├── common/
│   └── env.ts                      # Environment variable validation
├── connectors/
│   └── typeform/
│       ├── commons/
│       │   ├── errors.ts           # Custom error types
│       │   └── rate-limiter.ts    # Rate limiting utility
│       ├── members.ts              # Member management operations
│       ├── members.test.ts         # Member management tests
│       ├── users.ts                # User sync implementation
│       ├── users.test.ts           # User sync tests
│       ├── workspaces.ts           # Workspace API client
│       └── workspaces.test.ts      # Workspace API tests
└── inngest/
    └── client.ts                   # Inngest client and functions
```

## API Implementation Details

### Workspace Management

The `workspaces.ts` module provides:

- `getWorkspaces()`: Fetches paginated list of workspaces
- `getWorkspaceDetails()`: Retrieves workspace with member information

### User Synchronization

The `users.ts` module implements:

- Complex pagination handling across workspaces
- Batch size management to respect Elba's limits
- Member aggregation from multiple workspaces

### Member Deletion

The `members.ts` module provides:

- `removeUserFromAllWorkspaces()`: Removes a user from all their workspaces
- Continues processing even if individual workspace operations fail

## Testing

The integration includes comprehensive test coverage:

```bash
pnpm test        # Run all tests
pnpm test:watch  # Run tests in watch mode
pnpm lint        # Run ESLint
pnpm type-check  # Run TypeScript compiler
```

## Deployment

This integration is deployed as a Next.js application. Ensure all environment variables are configured in your deployment platform.

## Typeform API Limitations

- **Rate Limit**: 2 requests per second per account
- **No Direct User API**: Must iterate through workspaces
- **Email-Based Identification**: Users are identified by email address
- **No Suspension**: Only add/remove operations are supported

## Resources

- [Typeform API Documentation](https://www.typeform.com/developers/get-started/)
- [Typeform Workspace API](https://www.typeform.com/developers/create/workspaces/)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
