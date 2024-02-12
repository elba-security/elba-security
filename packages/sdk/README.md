# elba-sdk

`@elba-security/sdk` is a client wrapping elba Open API endpoints, and common utils. It's designed to simplify interactions with elba Open API.

## Installation

To install `sdk`, run:

```sh
pnpm add @elba-security/sdk
```

## Client usage

To start using the `sdk` client, you'll need to set up your environment variables and instantiate the client:

```ts
import { Elba } from '@elba-security/sdk';

const elba = new Elba({
  organisationId: 'foo-bar',
  apiKey: process.env.ELBA_API_KEY,
  region: 'us',
  // baseUrl: process.env.ELBA_LOCAL_BASE_URL - optional, can be useful in a local environnement
});
```

## API Reference

### Utils

#### getRedirectUrl

Generates a URL with appended parameters for elba redirection based on the source ID, base URL, and an optional error code.
When no error is given, the user will be redirected on a success page.

**Example:**

```ts
import { getRedirectUrl } from '@elba-security/sdk';

const redirectUrl = getRedirectUrl({
  sourceId: env.ELBA_SOURCE_ID,
  baseUrl: env.ELBA_REDIRECT_URL,
  error: 'unauthorized',
  region: 'eu',
});
```

### Webhook

#### validateWebhookEventSignature

Validate a webhook event request by checking its signature against a webhook secret.

**Example:**

```ts
import { validateWebhookRequestSignature } from '@elba-security/sdk';

export async function middleware(request: NextRequest) {
  try {
    await validateWebhookRequestSignature(request, env.ELBA_WEBHOOK_SECRET);
  } catch (error) {
    return new NextResponse(null, { status: 401, statusText: 'unauthorized' });
  }
}
```

#### parseWebhookEventData

Parse webhook event data and validate it against schema.

**JSON payload example:**

```ts
import { parseWebhookEventData } from '@elba-security/sdk';

export async function POST(request: NextRequest) {
  const data: unknown = await request.json();
  const { organisationId } = parseWebhookEventData('data_protection.start_sync_requested', data);
}
```

**seach params example:**

```ts
import { parseWebhookEventData } from '@elba-security/sdk';

export async function GET(request: NextRequest) {
  const data = parseWebhookEventData('some_event', request.nextUrl.searchParams);
}
```

### Users

Interact with user data in elba. These methods allow for updating and deleting user information based on different criteria.

#### Update Users

Send a batch of users to elba:

```ts
elba.users.update(users);
```

#### Delete Users by sync date

Delete users that have been synced before a date:

```ts
elba.users.delete({ syncedBefore: syncStartedAt });
```

_Typically used with the start of the current scan._

#### Delete Users by ids

Delete users by their ids:

```ts
elba.users.delete({ ids: userIds });
```

_Used when the integration retrieve data from SaaS using webhook._

### Data protection

Manage data protection objects in elba, including updating and deleting records.

#### Update Data Protection Objects

Send a batch of objects to elba:

```ts
elba.dataProtection.updateObjects(objects);
```

#### Delete Data Protection Objects by sync date

Delete objects that have been synced before a date:

```ts
elba.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });
```

_Typically used with the start of the current scan._

#### Delete Data Protection Objects by ids

Delete objects by their ids:

```ts
elba.dataProtection.deleteObjects({ ids: objectIds });
```

_Used when the integration retrieve data from SaaS using webhook._

### third party apps

Handle third-party app data in elba.

#### Update Third Party Apps

Send a batch of third-party apps to elba:

```ts
elba.thirdPartyApps.updateObjects(objects);
```

#### Delete Third Party Apps by sync date

Delete apps that have been synced before a specified date:

```ts
elba.thirdPartyApps.deleteObjects({ syncedBefore: syncStartedAt });
```

_Typically used with the start of the current scan._

#### Delete Third Party Apps by ids

Delete apps by their ids:

```ts
elba.thirdPartyApps.deleteObjects({ ids: objectIds });
```

_Used when the integration retrieve data from SaaS using webhook._

### Connection status

#### Update Connection Status

Update the connection status of the elba organisation with the SaaS:

```ts
elba.connectionStatus.update(hasError);
```
