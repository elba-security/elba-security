# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is elba security's monorepo containing integrations between various SaaS platforms and elba's security platform. It uses Turborepo with pnpm workspaces to manage multiple Next.js applications and shared packages.

## Essential Commands

### Development

```bash
# Install dependencies (requires pnpm v9.5.0)
pnpm install

# Generate a new integration from template
pnpm generate

# Run development server for a specific app
cd apps/[integration-name]
pnpm dev

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run a single test file
pnpm test path/to/file.test.ts

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build all packages
pnpm build
```

### Integration-Specific Development

Each integration runs on its own port (e.g., HubSpot on 4000). When developing:

1. Navigate to the specific app: `cd apps/[integration-name]`
2. Create `.env.test` file with required environment variables
3. Run `pnpm dev` to start the development server

## Architecture Overview

### Monorepo Structure

- `/apps/*` - Individual SaaS integrations (Next.js apps)
- `/packages/*` - Shared packages:
  - `@elba-security/sdk` - Core SDK for Elba API
  - `@elba-security/inngest` - Inngest event handling utilities
  - `@elba-security/schemas` - Shared TypeScript schemas
  - `@elba-security/test-utils` - Testing utilities with MSW
  - `@elba-security/common` - Common utilities and error types
- `/template/` - Template for generating new integrations

### Integration Architecture Pattern

#### OAuth Flow

All OAuth authentication is handled externally by Nango. Integrations receive access tokens through Nango connections.

#### Event-Driven Processing

Uses Inngest for async event processing. Two patterns exist:

1. **Legacy Pattern** (being phased out):

   - Manual event definitions in `inngest/client.ts`
   - Separate webhook routes in `app/api/webhooks/elba/*`
   - Individual function files in `inngest/functions/*`

2. **New Pattern** (use this for new integrations):
   - Single `ElbaInngestClient` instance in `inngest/client.ts`
   - All functions created via client methods
   - Single route handler in `app/api/inngest/route.ts`
   - **NO `ELBA_API_BASE_URL` needed** - uses event-based communication
   - See `INTEGRATION_REFACTORING_CHECKLIST.md` for migration guide

#### File Organization

```
apps/[integration]/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── inngest/
│   │           └── route.ts        # Inngest webhook handler
│   ├── connectors/
│   │   └── [integration]/
│   │       ├── users.ts            # API client for user operations
│   │       └── users.test.ts       # Tests for API client
│   ├── inngest/
│   │   └── client.ts               # Inngest client and functions
│   └── common/
│       └── env.ts                  # Environment variable validation
```

### Error Handling

Use standardized error types from `@elba-security/common`:

- `IntegrationError` - General API errors
- `IntegrationConnectionError` - Authentication/connection errors with specific types:
  - `'unauthorized'` - 401 errors
  - `'not_admin'` - Insufficient permissions
  - `'unknown'` - Other connection issues

### Testing Strategy

- **Framework**: Vitest with edge-runtime environment
- **HTTP Mocking**: MSW (Mock Service Worker)
- **Pre-mocked APIs**: Elba API endpoints via `@elba-security/test-utils`
- **Test Location**: Co-located with source files (`.test.ts`)

### Key Patterns to Follow

1. **User Sync Implementation**:

   - Fetch users from SaaS API
   - Transform to Elba user format
   - Return paginated results with cursor
   - Mark non-suspendable users (admins, authenticated user)

2. **Error Recovery**:

   - Use `NonRetriableError` for permanent failures
   - Connection errors trigger automatic status updates
   - Rate limiting handled by middleware

3. **Type Safety**:
   - Use Zod schemas for API response validation
   - Export types for reuse
   - Validate environment variables

## Development Tips

- When creating a new integration, use `pnpm generate` and follow the template
- Check existing integrations (especially Zoom) for implementation patterns
- All secrets are managed through environment variables
- Use the provided test utilities for consistent mocking
- Run tests before committing to ensure nothing breaks
