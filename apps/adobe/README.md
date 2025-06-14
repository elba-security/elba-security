# Adobe Integration for Elba Security

This integration connects Adobe User Management API (UMAPI) with Elba Security to provide user synchronization and management capabilities.

## Features

- **User Synchronization**: Syncs Adobe users to Elba
- **Authentication**: OAuth2 via [Nango](https://nango.dev/) with Adobe UMAPI integration
- **Event-Driven Architecture**: Async event processing using [Inngest](https://www.inngest.com/)
- **Type Safety**: Full TypeScript support with Zod validation

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=
   NANGO_INTEGRATION_ID=adobe-umapi
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

The server runs on port 4000.

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

## Adobe UMAPI Configuration

This integration uses Adobe's User Management API (UMAPI) which requires:

1. **Enterprise Account**: UMAPI is only available for Adobe enterprise customers
2. **OAuth Server-to-Server Credentials**: Created in Adobe Developer Console
3. **API Key**: Provided by Adobe when creating the integration

The integration automatically handles:

- Organization ID discovery
- User pagination (100 users per batch)
- Filtering of inactive users (only active users are synced)

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
│   └── adobe/                  # Adobe UMAPI implementation
│       ├── users.ts            # API client for user operations
│       └── users.test.ts       # Tests for API client
└── inngest/
    └── client.ts               # ElbaInngestClient setup and functions
```

## Environment Variables

| Variable                      | Description            | Default                           |
| ----------------------------- | ---------------------- | --------------------------------- |
| `ELBA_SOURCE_ID`              | Elba source identifier | Required                          |
| `NANGO_INTEGRATION_ID`        | Nango integration ID   | `adobe-umapi`                     |
| `NANGO_SECRET_KEY`            | Nango secret key       | Required                          |
| `ADOBE_API_BASE_URL`          | Adobe UMAPI base URL   | `https://usermanagement.adobe.io` |
| `ADOBE_USERS_SYNC_CRON`       | User sync schedule     | `0 0 * * *` (daily)               |
| `ADOBE_USERS_SYNC_BATCH_SIZE` | Users per API request  | `100`                             |

## API Implementation

The integration implements:

1. **User Fetching**: Retrieves users from Adobe UMAPI with pagination
2. **Organization Discovery**: Automatically fetches organization ID if not cached
3. **User Transformation**: Maps Adobe users to Elba's user format
4. **Error Handling**: Proper error handling for authentication and API failures

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

## Notes

- Only active Adobe users are synchronized to Elba
- The API key must be included in the X-Api-Key header for all requests
- Rate limits apply: 25 requests/minute per client, 100 requests/minute per application
- User tags feature will be deprecated after October 16, 2025

## Resources

- [Adobe UMAPI Documentation](https://adobe-apiplatform.github.io/umapi-documentation/)
- [Elba Documentation](https://docs.elba.io)
- [Nango Adobe UMAPI Integration](https://docs.nango.dev/integrations/all/adobe-umapi)
