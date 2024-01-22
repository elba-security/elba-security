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
| `organisationId` **(uuid)**           | string    | Yes      | Unique identifier for the organisation.                     |
| `sourceId` **(uuid)**                  | string    | Yes      | Unique source identifier for 
| `hasError`       | boolean | Yes      | Indicates if there is an error with access.|


Example request:
### CURL:
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

### Elba SDK:

```javascript
 elba.connectionStatus.update({ hasError: true });
```