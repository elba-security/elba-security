# Schedule User Scans with Inngest

In this tutorial, we'll walk through the process of setting up a scheduled function using Inngest to trigger user scans across multiple organizations.

## Overview

We are going to create a scheduled function that triggers daily scans of user data for each organization in our database. This function will use Inngest to handle the scheduling and execution of the scans.

### Prerequisites

- Basic understanding of JavaScript/TypeScript
- A project set up with Inngest
- Access to a database with organization data

## Step 1: Set Up Database Access

Ensure that you have a connection to your database set up. In this example, we are using a `db` module from `@/lib/db` which is assumed to be a pre-configured database connection.

Your `organizations` table should have at least a `tenantId` column, as this ID will be used to trigger scans for each organization.

```javascript
import { db } from '@/lib/db';
```

## Step 2: Define the Scheduled Function

Create a function that will be scheduled to run. We are using Inngest's `createFunction` to define the function.

```javascript
Copy code
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { inngest } from '../client';

export const scheduleUsersScans = inngest.createFunction(
{ id: 'schedule-users-scans' },
{ cron: '0 0 \* \* \*' },
async () => {
// Function implementation
}
);
```

## Step 3 : Query Organizations

Step 3: Query Organizations
Inside the function, query your database for all organizations. This will fetch an array of organizations, each with a tenantId.

```javascript
const orgs = await db.select({ tenantId: organizations.tenantId }).from(organizations);
```

## Step 4: Trigger Scans for Each Organization

Using `Promise.all`, iterate over the organizations and trigger a scan for each by sending a users/scan event to Inngest.

```javascript
await Promise.all(
  orgs.map(({ tenantId }) =>
    inngest.send({
      name: 'users/scan',
      data: { tenantId, isFirstScan: false },
    })
  )
);
```

## Conclusion

You have successfully created a scheduled function that triggers user scans for each organization in your database daily. This setup allows for automated, regular checks on user data, ensuring up-to-date information across your platform.

The final result should look like this :

```javascript
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { env } from '@/common/env';
import { inngest } from '../client';

export const scheduleThirdPartyAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async () => {
    const orgs = await db
      .select({
        tenantId: organizations.tenantId,
      })
      .from(organizations);
    await Promise.all(
      orgs.map(({ tenantId }) =>
        inngest.send({
          name: 'third-party-apps/start',
          data: { tenantId, isFirstScan: false },
        })
      )
    );
    return { status: 'scheduled' };
  }
);
```
