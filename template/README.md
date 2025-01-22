# Elba Integration Template

This template provides a foundation for building integrations with Elba Security. It follows the same structure as our production integrations like Bitbucket.

## Features

- **OAuth Authentication**: Pre-configured OAuth flow using [Nango](https://nango.dev/)
- **Event Handling**: Event-driven architecture using [Inngest](https://www.inngest.com/)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing**: Ready-to-use testing setup with Vitest

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_API_BASE_URL=
   ELBA_SOURCE_ID=
   ELBA_WEBHOOK_SECRET=
   NANGO_INTEGRATION_ID=
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

## Project Structure

```
src/
├── app/
│   └── api/
│       └── webhooks/
│           └── elba/
│               └── installation/
│                   └── validate/
│                       ├── route.ts    # Installation validation webhook
│                       └── service.ts  # Installation validation logic
├── common/
│   └── nango.ts        # Nango client configuration
├── connectors/
│   ├── common/
│   │   └── error.ts    # Error mapping utilities
│   └── elba/
│       └── client.ts   # Elba client utilities
└── inngest/
    └── client.ts       # Inngest client configuration
```

## Features

### Installation Validation

The template includes a webhook-based installation flow that:

1. Validates the Nango connection
2. Verifies access to the source API
3. Triggers initial sync events

### Error Handling

Built-in error management features:

- Automatic mapping of common errors (401, 403, etc.)
- Connection status updates
- Error logging and serialization

## Development

1. Add your source-specific validation logic in `src/app/api/webhooks/elba/installation/validate/service.ts`
2. Implement your resource sync handlers
3. Add any additional webhooks needed for your integration

## Testing

1. Copy `.env.test` to `.env.test.local` and configure test environment variables
2. Run tests:
   ```bash
   pnpm test
   ```

## Authentication Flow

1. User initiates OAuth flow through the installation URL
2. User is redirected to the service's OAuth consent screen
3. After consent, user is redirected back to `/api/auth/callback`
4. Nango handles token exchange and storage
5. Organization is registered with Elba
6. Initial sync is triggered via Inngest events

## Event Types

The template includes the following Inngest events:

```typescript
'app/installed': {
  data: {
    organizationId: string;
  }
}

'app/uninstalled': {
  data: {
    organizationId: string;
    region: string;
    errorType: ConnectionErrorType;
    errorMetadata?: unknown;
  }
}

'sync/requested': {
  data: {
    organizationId: string;
    region: string;
    nangoConnectionId: string;
    isFirstSync: boolean;
    syncStartedAt: number;
    page: string | null;
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
