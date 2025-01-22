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

## `/common`

Common utilities and shared configurations:

- `nango.ts`: Nango client configuration for OAuth handling
- `env.ts`: Environment variable validation and typing

## `/connectors`

The `connectors` contain various files, each exporting functions that interact with the integrated SaaS. Each connector should address a single concern:

### `/common`

- `error.ts`: Error mapping utilities for handling connection errors

### `/elba`

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
