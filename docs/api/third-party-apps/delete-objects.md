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
| `organisationId` **(uuid)**      | string   | Yes      | Unique identifier for the organisation.                   |
| `sourceId` **(uuid)**               | string   | Yes      | Unique source identifier for tracking.                    |
| `ids`                    | array    | Yes      | Array of objects representing app-user associations.      |
| `ids[].appId`            | string   | Yes      | Unique identifier for the app.                            |
| `ids[].userId`           | string   | Yes      | Unique identifier for the user associated with the app.   |

Example request:

### CURL:
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

### Elba SDK:
##### Delete the elba third party apps that has been sent before this sync
```javascript
elba.thirdPartyApps.deleteObjects({
   syncedBefore: "2023-01-01T00:00:00.000Z",
});
```

#### Delete third party apps by `appId` & `userId`
```javascript
elba.thirdPartyApps.deleteObjects({
  ids: [
    {
      appId: 'app-id-1',
      userId: 'user-id-1'
    }
  ]
});
```

Example success response:

```json
{
  "success": true
}
```