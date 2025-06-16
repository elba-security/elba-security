# Make Integration for Elba

This integration connects Make (formerly Integromat) with Elba for user access management and security reviews.

## Features

- User synchronization across all organizations
- User role and permission tracking
- User suspension/removal capabilities
- Support for multiple organizations

## Configuration

The integration requires the following environment variables:

- `ELBA_SOURCE_ID`: Your Elba source ID
- `NANGO_INTEGRATION_ID`: Nango integration ID for Make
- `NANGO_SECRET_KEY`: Nango secret key
- `MAKE_USERS_SYNC_CRON`: Cron schedule for user sync (defaults to daily)
- `MAKE_USERS_SYNC_BATCH_SIZE`: Number of users to fetch per page (defaults to 50)

## API Authentication

This integration uses API key authentication through Nango. Users need to provide:

1. Their Make API token
2. Their Make environment URL (e.g., `eu1.make.com`, `us1.make.com`)

The environment URL is configured in Nango's connection configuration and is used to dynamically determine the correct API endpoint for each customer's Make instance.

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Implementation Details

### User Sync

The integration syncs users from all organizations the authenticated user has access to. It:

1. Fetches all organizations
2. Iterates through each organization to fetch users
3. Marks Admin and Owner users as non-suspendable
4. Provides pagination support for large organizations

### User Deletion

User removal removes them from the organization, not from Make entirely. The integration attempts to remove the user from all organizations they belong to.

### Error Handling

The integration handles various error scenarios:

- 401 Unauthorized: Triggers authentication error
- 404 Not Found: Silently handled for user deletion
- Other errors: Logged and propagated as integration errors

## Testing

The integration includes comprehensive tests for:

- User fetching with pagination
- Authentication validation
- Organization listing
- User removal
- Error scenarios

Run tests with:

```bash
pnpm test
```

## Resources

- [Make API Documentation](https://developers.make.com/api-documentation)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
