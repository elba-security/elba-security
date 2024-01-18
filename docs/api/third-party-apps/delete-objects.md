## Delete Third-Party App Users

This endpoint is designed for removing specific user associations from third-party apps within an organisation in the Elba system.

### DELETE Third-Party App User Associations

> Version 1.0

This method enables the deletion of user associations with third-party applications based on specific app and user identifiers.

```plaintext
DELETE /api/rest/third-party-apps/objects
```

Supported attributes:

| Attribute                | Type     | Required | Description                                               |
|--------------------------|----------|----------|-----------------------------------------------------------|
| `organisationId`         | string   | Yes      | Unique identifier for the organisation.                   |
| `sourceId`               | string   | Yes      | Unique source identifier for tracking.                    |
| `ids`                    | array    | Yes      | Array of objects representing app-user associations.      |
| `ids[].appId`            | string   | Yes      | Unique identifier for the app.                            |
| `ids[].userId`           | string   | Yes      | Unique identifier for the user associated with the app.   |

Example request:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/third-party-apps/objects" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "sourceId": "source-id",
    "ids": [
      {
        "appId": "app-id",
        "userId": "user-id"
      }
    ]
  }'
```

### Elba Sdk Example
```javascript
import { Elba } from '@elba-security/sdk'
import { type MySaasThirdPartyApp, getThirdPartyApps } from '@/connectors/third-party-apps';


export const runThirdPartyAppsSyncJobs = inngest.createFunction(
  { event: 'third-party-apps/run-sync-jobs' },
  async ({ event, step }) => {
  const { organisationId, syncStartedAt, cursor, region } = event.data;

  step.run('start-third-party-apps-sync', async () => {
      // logics ..
  });

  // delete the elba third party apps that has been sent before this sync
   await step.run('finalize-third-party-apps-sync', async () => {
    return elba.thirdPartyApps.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  // OR
  // Based on your logic you can specifically provide the user ids & app ids to delete
  // Note: you are not allowed to use both methods together
   await step.run('finalize-third-party-apps-sync', async () => {
    return elba.thirdPartyApps.deleteObjects({
      ids: [
        {
            appId: 'app-id-1',
            userId: 'user-id-1'
        }
      ]
    });
  });

  ```