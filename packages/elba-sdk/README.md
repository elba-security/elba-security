# elba-sdk

`elba-sdk` is a client wrapping elba Open API endpoint, designed to simplify interactions with [specific functionalities]. It provides methods for [brief description of key features].

## Installation

Before installing, make sure you have [prerequisites]. To install `elba-sdk`, run:

```sh
pnpm i elba-sdk
```

## Usage

To start using elba-sdk, you'll need to set up your environment variables and instantiate the client:

```ts
import { Elba } from 'elba-sdk';

const elba = new Elba({
  organisationId: 'foo-bar',
  sourceId: process.env.ELBA_SOURCE_ID,
  apiKey: process.env.ELBA_API_KEY,
  // baseUrl: process.env.ELBA_LOCAL_BASE_URL - optionnal, can be usefull in a local environnement
});
```

## API Reference

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

### Authentication

Manage authentication methods for users in elba.

#### Update Authentication Methods

Send a batch of users with their authentication methods to elba:

```ts
elba.authentication.updateObjects(objects);
```

### Connection status

#### Update Connection Status

Update the connection status of the elba organisation with the SaaS:

```ts
elba.connectionStatus.update(hasError);
```
