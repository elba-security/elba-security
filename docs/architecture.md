# Architecture

This document outlines the architecture for integrations using the modern ElbaInngestClient pattern.

**Note:** Integrations are event-driven and do not include React components. All interactions happen through Inngest events and API routes.

## `/app`

The `/app` folder contains the Next.js application structure with a single API endpoint for Inngest webhook handling.

### `/api/inngest`

Contains the single route handler (`route.ts`) that processes all Inngest events. This replaces the multiple webhook endpoints used in legacy integrations.

## Authentication Flow

Authentication with source platforms is handled entirely by [Nango](https://nango.dev/):

### How it Works

1. **External Authentication**:

   - Nango handles OAuth2, API Key, and Basic Auth flows
   - This happens outside of our integration code
   - Integrations receive credentials through the `connection` object

2. **Integration Authentication**:

   ```typescript
   // OAuth2
   connection.credentials.access_token;

   // API Key
   connection.credentials.apiKey;

   // Basic Auth
   connection.credentials.username;
   connection.credentials.password;
   ```

3. **Flow Diagram**:

   ```text
   ┌────────┐    ┌───────┐    ┌─────────────┐    ┌──────────┐
   │  User  │───>│ Nango │───>│ Integration │───>│ Source   │
   │        │    │ Auth  │    │   (Inngest) │    │   API    │
   └────────┘    └───────┘    └─────────────┘    └──────────┘
                     │
                     └── Provides credentials & connection config
   ```

## `/common`

Common utilities and shared configurations:

- `env.ts`: Environment variable validation using Zod schemas

## `/connectors`

The `connectors` directory contains pure API interactions with external services:

```
├── connectors/
│   └── [source-name]/    # External API calls
│       ├── users.ts      # User operations
│       └── users.test.ts # Tests
```

### API Connectors

Connector modules should:

- Use Zod schemas for response validation
- Handle pagination appropriately
- Use standard error types (`IntegrationError`, `IntegrationConnectionError`)
- Include comprehensive tests using MSW

## `/inngest`

### `client.ts`

The heart of the integration, using ElbaInngestClient:

```typescript
export const elbaInngestClient = new ElbaInngestClient({
  name: 'integration-name',
  nangoAuthType: 'OAUTH2' | 'API_KEY' | 'BASIC',
  nangoIntegrationId: env.NANGO_INTEGRATION_ID,
  nangoSecretKey: env.NANGO_SECRET_KEY,
  sourceId: env.ELBA_SOURCE_ID,
});
```

The client provides these methods:

- `createElbaUsersSyncSchedulerFn()`: Schedules periodic user syncs
- `createElbaUsersSyncFn()`: Implements user synchronization logic
- `createElbaUsersDeleteFn()`: Implements user deletion
- `createInstallationValidateFn()`: Validates installations

### Event Flow

The ElbaInngestClient handles all event orchestration internally. Events are sent to Elba's own Inngest functions:

- `{region}/elba/users.updated`: When users are synced
- `{region}/elba/users.deleted`: When users are deleted
- `{region}/elba/app.installed`: When app is installed
- `{region}/elba/app.uninstalled`: When app is uninstalled

## Key Differences from Legacy Pattern

### Legacy Pattern (Deprecated)

- Multiple webhook endpoints in `/app/api/webhooks/elba/*`
- Direct Elba SDK calls requiring `ELBA_API_BASE_URL`
- Manual event definitions
- Separate function files in `/inngest/functions/*`
- Uses `ELBA_WEBHOOK_SECRET` for webhook validation

### Modern Pattern (Use This)

- Single Inngest route handler at `/app/api/inngest/route.ts`
- Event-based communication (no direct API calls)
- All functions created via ElbaInngestClient methods
- No `ELBA_API_BASE_URL` or `ELBA_WEBHOOK_SECRET` needed
- Cleaner, more maintainable architecture

## Testing

Tests should be placed alongside the files they test with a `.test.ts` extension:

- API connector tests using MSW for HTTP mocking
- Pre-mocked Elba API endpoints via `@elba-security/test-utils`
- Edge runtime environment for compatibility

## Error Handling

Use standardized error types:

```typescript
// General API errors
throw new IntegrationError('Error message', { response });

// Authentication/connection errors
throw new IntegrationConnectionError('Unauthorized', {
  type: 'unauthorized' | 'not_admin' | 'unknown',
});
```

Connection errors trigger automatic status updates in Elba.
