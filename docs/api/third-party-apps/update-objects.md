## Update Third-Party Apps
This endpoint facilitates the updating of third-party app information within an organisation in the Elba system.

### POST Third-Party App Data

> Version 1.0

This method allows for updating details of third-party applications associated with an organisation, including app details and associated users.

```plaintext
POST /api/rest/third-party-apps/objects
```

Supported attributes:

| Attribute                | Type     | Required | Description                                             |
|--------------------------|----------|----------|---------------------------------------------------------|
| `sourceId` **(uuid)**            | string   | Yes      | Unique source identifier for tracking.                  |
| `organisationId` **(uuid)**         | string   | Yes      | Unique identifier for the organisation.                 |
| `apps`                   | array    | Yes      | Array of third-party app objects to be updated.         |
| `apps[].id`              | string   | Yes      | Unique identifier for the app.                          |
| `apps[].name`            | string   | Yes      | Name of the app.                                        |
| `apps[].description`     | string   | Yes      | Description of the app.                                 |
| `apps[].logoUrl`         | string   | Yes      | URL of the app's logo.                                  |
| `apps[].url`             | string   | Yes      | URL of the app.                                         |
| `apps[].publisherName`   | string   | Yes      | Name of the app's publisher.                            |
| `apps[].users`           | array    | Yes      | Array of users associated with the app.                 |
| `apps[].users[].id`      | string   | Yes      | Unique identifier for the user.                         |
| `apps[].users[].scopes`  | array    | Yes      | Scopes associated with the user for this app.           |
| `apps[].users[].createdAt`| datetime| Yes      | Creation date of the user's association with the app.   |
| `apps[].users[].lastAccessedAt`| datetime | Yes | Last access date of the user for this app.             |

Example request:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request POST \
  --url "https://api.elba.ninja/api/rest/third-party-apps/objects" \
  --header "Content-Type: application/json" \
  --data '{
    "sourceId": "source-id",
    "organisationId": "organisation-id",
    "apps": [
      {
        "id": "source-app-id-5",
        "name": "source-app-name-5",
        "description": "source-app-description-5",
        "logoUrl": "http://foobar.com/source-app-logo-url-5.png",
        "url": "http://foobar.com/source-source-app/5",
        "publisherName": "source-app-publisher-name-1",
        "users": [
          {
            "id": "102079318273180779447",
            "scopes": [
              "source-app-scopes-1",
              "source-app-scopes-2",
              "source-app-scopes-3",
              "source-app-scopes-4"
            ],
            "createdAt": "2021-05-01T00:00:00.000Z",
            "lastAccessedAt": "2021-06-01T00:00:00.000Z"
          }
        ]
      }
    ]
  }'
```

### Elba SDK Example

To update third-party apps using the Elba SDK, the following JavaScript code can be used:

### Elba Sdk
```javascript
import { Elba } from '@elba-security/sdk'
import { inngest } from '@/inngest/client';
import { type MySaasThirdPartyApp, getThirdPartyApps } from '@/connectors/third-party-apps';

const formatElbaThirdPartyApps = (app: MySaasThirdPartyApp) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    logoUrl: app.logo,
    url: app.publisherUrl,
    publisherName: app.publisherName,
    users: [
      {
        id: app.user.id,
        scopes: app.user.scopes,
        createdAt:app.user.createdAt,
        lastAccessedAt: app.user.lastAccessedAt
      }
    ]
});

export const runThirdPartyAppsSyncJobs = inngest.createFunction(
  { event: 'third-party-apps/run-sync-jobs' },
  async ({ event, step }) => {
  const { organisationId, syncStartedAt, cursor, region } = event.data;

  const elba = new Elba({
    organisationId,
    sourceId: 'source-id',
    apiKey: 'elba-api-key',
    baseUrl: 'elba-base-url',
    region,
  });

  step.run('start-third-party-apps-sync', async () => {
      // retrieve all the connected third party apps by the team members
      const result = await getThirdPartyApps(token, cursor);
      // format each SaaS third party apps to elba apps
      const thirdPartyApps = result.apps.map(formatElbaThirdPartyApps);
      // send the batch of third party apps to elba
      await elba.thirdPartyApps.updateObjects({ apps: thirdPartyApps});
  });

  // delete the elba third party apps that has been sent before this sync
   await step.run('finalize-third-party-apps-sync', async () => {
    return elba.thirdPartyApps.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  ```
