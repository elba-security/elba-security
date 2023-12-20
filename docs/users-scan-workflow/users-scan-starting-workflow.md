# Start Users Scan Function

This document outlines the code for a function `startUsersScan` designed to initiate a user scan process. The function is built using the Inngest framework.

## Prerequisites

You need to setup a users scan scheduling workflow in order for this to work. Therefore, if you didn't implement it yet, you should refer to our users scan scheduling workflow doc.

## Overview

The `startUsersScan` function is triggered by an event named `'users/start'`. It prepares the necessary data for a user scan and then triggers another function to perform the actual scan.

## Function Details

- **Function ID:** `start-users-scan`
- **Event Trigger:** `users/start`
- **Priority Calculation:** A higher priority is assigned if the scan is the first one.

## Function Logic

```javascript
import { getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const startUsersScan = inngest.createFunction(
  {
    id: 'start-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'users/start',
  },
  async ({ event, step }) => {
    const syncStartedAt = Date.now();
    const { tenantId, isFirstScan } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    await step.sendEvent('scan-users', {
      name: 'users/scan',
      data: {
        tenantId,
        organizationId: organization.elbaOrganizationId,
        syncStartedAt: syncStartedAt.toString(),
        isFirstScan,
        accessToken: token.accessToken,
      },
    });
    return { status: 'started' };
  }
);
```

# Start Users Scan Function

This document outlines the code for a function `startUsersScan` designed to initiate a user scan process. The function is built using the Inngest framework.

## Overview

The `startUsersScan` function is triggered by an event named `'users/start'` which is being sent by our users sync scheduling workflow, called `scheduleUsersScans`. It prepares the necessary data for a user scan and then triggers another function to perform the actual scan.

## Function Details

- **Function ID:** `start-users-scan`
- **Event Trigger:** `users/start`
- **Priority Calculation:** A higher priority is assigned if the scan is the first one.

## Function Logic

```javascript
import { getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const startUsersScan = inngest.createFunction(
  {
    id: 'start-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'users/start',
  },
  async ({ event, step }) => {
    const syncStartedAt = Date.now();
    const { tenantId, isFirstScan } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    await step.sendEvent('scan-users', {
      name: 'users/scan',
      data: {
        tenantId,
        organizationId: organization.elbaOrganizationId,
        syncStartedAt: syncStartedAt.toString(),
        isFirstScan,
        accessToken: token.accessToken,
      },
    });
    return { status: 'started' };
  }
);
```

## Key Steps in the Function

### Initialization

The current time is recorded to mark the start of the sync.
The tenant ID and a flag indicating if it's the first scan are extracted from the event data.

### Organization and Token Retrieval

Retrieves the organization details and access token for the Microsoft Graph API, both of which are necessary for the user scan.

### Triggering the Scan

Sends an event users/scan to start the actual user scanning process.
Passes along necessary data including tenant ID, organization ID, sync start time, and access token.

### Function Completion

Returns a status indicating that the scanning process has started.
Conclusion
The startUsersScan function serves as an initiator for the user scanning process in an application, handling preliminary data fetching and setting up the environment for a subsequent detailed scan.
