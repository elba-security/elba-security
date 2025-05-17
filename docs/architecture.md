# Architecture

This document outlines the architecture for integrations. It emphasizes the separation of concerns through an organized file structure.

**Note:** Integrations are not expected to include React components. Routes should be utilized for handling webhooks and events.

## `/app`

The `/app` folder contains the Next.js application structure, including the API endpoints and other routing-related files. This folder is essential when using the Next.js App Router.

### `/api`

This directory houses the API endpoints. Each folder contains a file named `route.ts` that represents an accessible route, and usually a `service.ts` that's associated with the route file.

### `/webhooks`

The `/webhooks` directory contains all webhook endpoints that handle events from Elba and the integrated service. The main webhook endpoints are:

- `/webhooks/elba/installation/validate`: Handles installation validation and triggers initial sync
- Additional webhooks specific to your integration's needs

### `route.ts`

The route file (`route.ts`) is responsible for handling the requests data extraction and crafting responses. The business logic for the endpoint should reside in the corresponding `service.ts` file within the same directory.

### `service.ts`

The service file (`service.ts`) focuses exclusively on business logic. It should neither create a `Response` object nor read properties from the `Request`. If external API data access is required, the service should import a function from a connector.

## Authentication Flow

The authentication with source platforms (like Bitbucket, Cal.com, etc.) is handled entirely by [Nango](https://nango.dev/), our OAuth provider:

### How it Works

1. **External OAuth Flow**:

   - Nango handles the complete OAuth flow with the source platform
   - This happens outside of our integration code
   - Integrations never implement OAuth flows directly

2. **Integration Authentication**:

   ```typescript
   // Example: Getting source API credentials
   const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
   // Use credentials.access_token for API calls
   ```

3. **Flow Diagram**:

   ```text
   ┌────────┐    ┌───────┐    ┌─────────────┐    ┌──────────┐
   │  User  │───>│ Nango │───>│ Integration │───>│ Source   │
   │        │    │ OAuth │    │             │    │   API    │
   └────────┘    └───────┘    └─────────────┘    └──────────┘
                     │
                     └── Provides nangoConnectionId
   ```

## `/common`

Common utilities and shared configurations:

- `nango.ts`: Nango client configuration for OAuth handling
- `env.ts`: Environment variable validation and typing

## `/connectors`

The `connectors` directory contains pure API interactions with external services. Each subdirectory focuses on a specific service:

```
├── connectors/
│   ├── source/    # External API calls (no dependencies)
│   │   ├── users.ts
│   │   ├── groups.ts
│   │   └── organisations.ts
│   └── elba/      # Pre-configured Elba client
│       └── client.ts
```

### `/source`

The `source` directory (e.g. `github`) contains modules that make direct API calls to the integrated service (e.g. Notion, Cal.com). These modules:

- Should not have any external dependencies
- Take all required parameters (API tokens, base URLs) as arguments
- Return data or throw errors

### `/elba`

The `elba` directory contains a pre-configured Elba client for use across the integration.

- `client.ts`: Elba client configuration and organization-specific utilities

## `/inngest`

Code specific to [Inngest](https://www.inngest.com/) should be organized in this folder.

### `client.ts`

`client.ts` initializes the Inngest client and defines events with their input data. Events follow a specific naming pattern:

- `{integrationName}/app.installed`: Triggered when the app is installed
- `{integrationName}/app.uninstalled`: Triggered when the app is uninstalled
- `{integrationName}/users.sync.requested`: Triggered to start user synchronization

### `/middlewares`

Inngest middlewares for error handling:

- `rate-limit-middleware.ts`: Handles rate limiting
- `elba-connection-error-middleware.ts`: Handles connection errors and maps them to appropriate error types

## Testing

Tests should be placed alongside the files they test with a `.test.ts` extension. The template includes examples of:

- Webhook endpoint testing
- Service logic testing
- Error handling testing
