## Update Connection Status

This endpoint is designed for updating the status of a SaaS connection for an organisation in the elba system. It's primarily used to inform elba about access denied issue, indicating that the source is no longer accessible and may require re-authentication or attention from the organization's admin.

### POST

This method allows for the update of a SaaS connection status, particularly to flag issues like access errors.

```text
POST /api/rest/connection-status
```

Supported attributes:

| Attribute                   | Type           | Required | Description                                                                                                                                                                |
| --------------------------- | -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organisationId` **(uuid)** | string         | Yes      | Unique identifier for the organisation.                                                                                                                                    |
| `errorType`                 | string or null | Yes      | The type of error. Supported values are `not_admin`, `unauthorized`, `unknown`, `unsupported_plan`, `multiple_workspaces_not_supported`. Use `null` when there is no error |
| `errorMetadata`             | object         | No       | The metadata related to the error.                                                                                                                                         |

Example requests:

#### CURL

```shell
curl
  --request POST \
  --url "https://api.elba.ninja/api/rest/connection-status" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "errorType": "unknown"
    "errorMetadata": {"message": "An unexpected error occurred"}
  }'
```

#### elba SDK

```javascript
elba.connectionStatus.update({
  errorType: 'unknown',
  errorMetadata: { message: 'An unexpected error occurred' },
});
```
