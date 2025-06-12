# Integration Refactoring Checklist

## Prerequisites

- Review the Zoom refactoring PR: https://github.com/elba-security/elba-security/pull/630/files
- Understand the new ElbaInngestClient pattern from `@elba-security/inngest`

## Step-by-Step Refactoring Process

### 1. Update package.json

- [ ] Remove dependencies:
  - `@elba-security/sdk`
  - `@elba-security/nango`
  - `date-fns` (unless used elsewhere)
  - `date-fns-tz` (unless used elsewhere)
- [ ] Keep/Add dependencies:
  - `@elba-security/inngest`
  - `@elba-security/schemas`
  - `inngest` (for NonRetriableError)
- [ ] Remove script: `"dev:inngest": "inngest-cli dev -u http://localhost:4000/api/inngest"`

### 2. Update Error Handling in connectors/[integration]/users.ts

- [ ] Replace import:

  ```typescript
  // OLD
  import { [Integration]Error } from '../common/error';

  // NEW
  import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
  ```

- [ ] Update all error throws:

  ```typescript
  // OLD
  throw new [Integration]Error('message', { response });

  // NEW - for 401 errors
  if (response.status === 401) {
    throw new IntegrationConnectionError('Unauthorized', {
      response,
      type: 'unauthorized',
    });
  }
  throw new IntegrationError('message', { response });
  ```

### 3. Update Test Files

- [ ] Update imports in users.test.ts to use new error types
- [ ] Replace `[Integration]Error` with `IntegrationConnectionError` or `IntegrationError` in expectations

### 4. Create New inngest/client.ts

- [ ] Import required dependencies:
  ```typescript
  import type { UpdateUsers } from '@elba-security/schemas';
  import { ElbaInngestClient } from '@elba-security/inngest';
  import { logger } from '@elba-security/logger';
  import { NonRetriableError } from 'inngest';
  import { env } from '@/common/env';
  ```
- [ ] Define User type: `type User = UpdateUsers['users'][number];`
- [ ] Create formatElbaUser function to transform integration users to Elba format
- [ ] Initialize ElbaInngestClient:
  ```typescript
  export const elbaInngestClient = new ElbaInngestClient({
    name: '[integration-name]',
    nangoAuthType: 'OAUTH2', // or 'API_KEY'
    nangoIntegrationId: env.NANGO_INTEGRATION_ID,
    nangoSecretKey: env.NANGO_SECRET_KEY,
    sourceId: env.ELBA_SOURCE_ID,
  });
  ```
- [ ] Create scheduler function:
  ```typescript
  export const syncUsersSchedulerFunction = elbaInngestClient.createElbaUsersSyncSchedulerFn(
    env.[INTEGRATION]_USERS_SYNC_CRON
  );
  ```
- [ ] Create sync function:
  ```typescript
  export const syncUsersFunction = elbaInngestClient.createElbaUsersSyncFn(
    async ({ connection, organisationId, cursor }) => {
      // Check access token
      // Fetch users
      // Format users
      // Return { users, cursor }
    }
  );
  ```
- [ ] Create delete function:
  ```typescript
  export const deleteUserFunction = elbaInngestClient.createElbaUsersDeleteFn({
    isBatchDeleteSupported: false, // or true
    deleteUsersFn: async ({ connection, id }) => {
      // Delete user logic
    },
  });
  ```
- [ ] Create validation function:
  ```typescript
  export const validateInstallationFunction = elbaInngestClient.createInstallationValidateFn(
    async ({ connection, organisationId }) => {
      // Validation logic
    }
  );
  ```

### 5. Update app/api/inngest/route.ts

- [ ] Replace entire file content:

  ```typescript
  import { elbaInngestClient } from '@/inngest/client';

  export const preferredRegion = 'iad1';
  export const runtime = 'edge';
  export const dynamic = 'force-dynamic';

  export const { GET, POST, PUT } = elbaInngestClient.serve();
  ```

### 6. Delete Old Files and Directories

- [ ] `rm -rf src/app/api/webhooks`
- [ ] `rm -rf src/inngest/functions`
- [ ] `rm -rf src/inngest/middlewares`
- [ ] `rm -f src/common/nango.ts`
- [ ] `rm -f src/connectors/common/error.ts`
- [ ] `rm -f src/connectors/elba/client.ts`
- [ ] `rmdir src/connectors/common src/connectors/elba` (if empty)

### 7. Fix Common Issues

- [ ] Remove optional chaining on `connection.credentials.access_token` (it's always defined)
- [ ] Ensure all imports are correct after file deletions
- [ ] Update any remaining references to old error types

### 8. Testing and Validation

- [ ] Run `pnpm install` to update dependencies
- [ ] Run `pnpm test` - all tests should pass
- [ ] Run `pnpm type-check` - no type errors
- [ ] Run `pnpm lint` - no lint errors

## Key Differences to Remember

1. **No more manual event definitions** - ElbaInngestClient handles all events internally
2. **No more webhook routes** - Everything goes through `/api/inngest`
3. **Simplified error handling** - Use IntegrationError and IntegrationConnectionError
4. **Connection access** - Use `connection.credentials.access_token` directly (no optional chaining)
5. **Batch operations** - Specify `isBatchDeleteSupported` in delete function
6. **Cursor type** - Default is string, but can be customized in `createElbaUsersSyncFn<CursorType>`

## Vercel Configuration

After deployment:

- Remove preview environment variables: `INNGEST_SIGNING_KEY` & `INNGEST_EVENT_KEY`
- Link preview shared environment variables: `INNGEST_SIGNING_KEY` & `INNGEST_EVENT_KEY`

## Elba Configuration

- Set `saas.sources.inngest_app_id` with the integration name
- Set `saas.sources.supports_suspend_user` when the integration supports suspending/deleting users
