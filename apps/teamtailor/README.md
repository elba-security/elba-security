# TeamTailor Integration

## Overview

This integration connects TeamTailor with Elba to provide user access management and security monitoring capabilities.

## Features

- **User Synchronization**: Automatically syncs TeamTailor users to Elba
- **Access Review**: Supports user access review workflows
- **User Management**: Can delete users from TeamTailor when requested through Elba

## Configuration

### Environment Variables

The following environment variables are required:

- `ELBA_SOURCE_ID`: Your Elba source ID (UUID format)
- `NANGO_SECRET_KEY`: Nango secret key for authentication
- `NANGO_INTEGRATION_ID`: Nango integration ID (e.g., `teamtailor-sandbox`)
- `TEAMTAILOR_API_BASE_URL`: TeamTailor API base URL (defaults to `https://api.teamtailor.com`)
- `TEAMTAILOR_API_REGION`: API region (`eu` or `us`, defaults to `eu`)
- `TEAMTAILOR_USERS_SYNC_CRON`: Cron expression for user sync schedule (defaults to `0 0 * * *`)
- `TEAMTAILOR_USERS_SYNC_BATCH_SIZE`: Number of users to sync per batch (defaults to 50)

### API Key Setup

1. Log in to your TeamTailor account
2. Navigate to Settings → Integrations → API keys
3. Create a new API key with admin permissions
4. Configure the API key in Nango

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local database)

### Local Setup

1. Copy `.env.local.example` to `.env.local` and fill in your values
2. Start the database: `pnpm database:up`
3. Run migrations: `pnpm database:migrate`
4. Start the development server: `pnpm dev`
5. Start Inngest: `pnpm dev:inngest`

### Testing

Run tests with: `pnpm test`

## API Details

### Authentication

TeamTailor uses API key authentication with the following header format:

```
Authorization: Token token=YOUR_API_KEY
```

### Regional Endpoints

- EU (Ireland): `api.teamtailor.com`
- US West (Oregon): `api.na.teamtailor.com`

The integration automatically handles the regional endpoint based on the `TEAMTAILOR_API_REGION` environment variable.

### Rate Limiting

TeamTailor API has a rate limit of 50 requests per 10 seconds.

## User Sync Details

### User Mapping

TeamTailor users are mapped to Elba users with the following fields:

- `id`: TeamTailor user ID
- `displayName`: User's full name
- `email`: User's email address
- `isSuspendable`: `true` for all users except Company admins
- `metadata`: Includes role, status, and department information

### Limitations

- TeamTailor API only supports user deletion (hard delete), not suspension
- The integration cannot modify user roles or permissions via API
- Only users with Company Admin role are marked as non-suspendable
