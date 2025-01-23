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

## Authentication & Installation Flow

The authentication flow happens entirely in Elba's SaaS platform. Once completed:

1. Elba calls the integration's webhook endpoint `/api/webhooks/elba/installation/validate`
2. The integration performs additional checks (e.g., verifying admin permissions)
3. If validation succeeds, initial sync events are triggered

For implementation details, see `src/app/api/webhooks/elba/installation/validate/`.

## Event Types

The template includes the following Inngest events:

```typescript
'{{name}}/app.installed': {
  data: {
    organisationId: string;
  }
}

'{{name}}/app.uninstalled': {
  data: {
    organisationId: string;
    region: string;
    errorType: ConnectionErrorType;
    errorMetadata?: unknown;
  }
}

'{{name}}/users.sync.requested': {
  data: {
    organisationId: string;
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
