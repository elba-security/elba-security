# Segment Integration

This integration connects Segment with Elba to sync user data.

## Features

- User synchronization from Segment workspaces
- User deletion/deactivation support
- Automatic periodic syncing via cron schedule

## Architecture

This integration uses:

- **Nango** for OAuth2 authentication with Segment
- **ElbaInngestClient** for event-driven processing
- **Edge runtime** for optimal performance

## Environment Variables

The following environment variables are required:

```env
# Elba Configuration
ELBA_SOURCE_ID=             # Your Elba source ID

# Nango Configuration
NANGO_SECRET_KEY=           # Your Nango secret key
NANGO_INTEGRATION_ID=       # Your Nango integration ID (e.g., "segment")

# Segment Configuration
SEGMENT_API_BASE_URL=       # Default: https://api.segmentapis.com
SEGMENT_USERS_SYNC_CRON=    # Default: "0 0 * * *" (daily at midnight)
SEGMENT_USERS_SYNC_BATCH_SIZE= # Default: 100
```

## Getting Started

### Development

1. Copy `.env.local.example` to `.env.local` and fill in the required values

2. Run the development server:
   ```bash
   pnpm dev
   ```

### Testing

Run the test suite:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

### Type Checking & Linting

```bash
pnpm type-check
pnpm lint
```

## API Endpoints

- `GET/POST/PUT /api/inngest` - Inngest webhook handler

## How It Works

1. **Authentication**: Users authenticate via OAuth2 through Nango
2. **User Sync**: The integration fetches users from Segment's API and syncs them to Elba
3. **Scheduled Sync**: A cron job runs periodically to keep user data in sync
4. **User Management**: Supports deleting/deactivating users when removed from Elba

## Segment API Integration

This integration uses the following Segment API endpoints:

- `GET /users` - Fetch workspace users with pagination
- `DELETE /users` - Delete specific users
- `GET /` - Get workspace information

## Notes

- All users are marked as suspendable since the API doesn't provide information about the authenticated user
- User profile URLs direct to Segment's access management page for each user
- The integration supports pagination for large user lists
