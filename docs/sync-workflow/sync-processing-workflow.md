# Scan Users Function Documentation

This document provides a detailed overview of the `scanUsers` function, which is part of a system designed for scanning and synchronizing user data. This function is built using the Inngest framework and integrates with the Elba SDK for user management.

## Function Overview

The `scanUsers` function is a key component in handling user data synchronization. It is triggered by an `users/scan` event and is responsible for paginating through user data, updating user information, and managing data synchronization state.

## Configuration

- **Function ID:** `scan-users`
- **Event Trigger:** `users/scan`
- **Priority Calculation:** Prioritizes first scans with a higher priority value.
- **Retries:** Defined by `env.USERS_SYNC_MAX_RETRY`.
- **Idempotency:** Ensures idempotent behavior outside of the development environment.
- **Concurrency:** Limits the number of concurrent user syncs based on environmental configurations.

## Function Logic

```javascript
import { Elba } from '@elba-security/sdk';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { env } from '@/common/env';
import { inngest } from '../client';
import { handleError } from '../functions/utils';

export const scanUsers = inngest.createFunction(
  {
    // Function configuration...
  },
  {
    event: 'users/scan',
  },
  async ({ event, step }) => {
    // Extracting data from the event...
    // Initializing Elba SDK...
    // Paginate and update users...
    // Handling cursor for next page or finalizing...
  }
);
```

## Key Steps in the Function

### Extract Data

Retrieves tenant ID, sync start time, organization ID, and access token from the event data.
Determines if it's the first scan or a subsequent one.

### Initialize Elba SDK

Configures the Elba SDK with necessary parameters for user management.

### Paginate and Update Users

Paginates through user data from the Microsoft Graph API.
Updates user information using the Elba SDK.

### Cursor Management

Determines the next page of data to be fetched.
Sends an event to continue scanning if more data is available.

### Finalization

If no more data is available, finalizes the sync process by deleting users synced before the start time.

### Return Status

Returns the status of the scan process ('ongoing' or 'completed').

### Conclusion

The scanUsers function plays a crucial role in the user data synchronization process. It efficiently handles data pagination, updating, and state management to ensure that user data is accurately and consistently synchronized.
