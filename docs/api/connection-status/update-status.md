## Update Connection Status
This endpoint is designed for updating the status of a SaaS connection for an organisation in the Elba system. It's primarily used to inform Elba about access denied issue, indicating that the source is no longer accessible and may require re-authentication or attention from the organization's admin.

### POST Connection Status Update

> Version 1.0

This method allows for the update of a SaaS connection status, particularly to flag issues like access errors.

```plaintext
POST /api/rest/connection-status
```

Supported attributes:

| Attribute        | Type    | Required | Description                                |
|------------------|---------|----------|--------------------------------------------|
| `organisationId` **(uuid)** | UUID    | Yes      | UUID of the organisation.                  |
| `sourceId` **(uuid)**      | UUID    | Yes      | UUID of the source.                        |
| `hasError`       | boolean | Yes      | Indicates if there is an error with access.|


Example request:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request POST \
  --url "https://api.elba.ninja/api/rest/connection-status" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "sourceId": "source-id",
    "hasError": true
  }'
```

### Elba SDK Example:

To update the connection status using the Elba SDK, the following JavaScript code can be used:

```javascript
import { Elba } from '@elba-security/sdk'
import { inngest } from '@/inngest/client';

export const syncUsersPage = inngest.createFunction(
  { event: 'connection/update-connection-status' },
  async ({ event, step }) => {;

  const { organisationId, region } = event.data;

  const elba = new Elba({
    organisationId,
    sourceId: 'source-id',
    apiKey: 'elba-api-key',
    baseUrl: 'elba-base-url',
    region,
  });

  
  // delete the elba users that has been sent before this sync
  await step.run('update-source-connection-status', () =>
    elba.connectionStatus.update({ hasError: true })
  );
}