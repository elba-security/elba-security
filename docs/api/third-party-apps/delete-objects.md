## Delete Third-Party Apps

This endpoint is designed to remove specific app associations with a user within an organization in the Elba system.

### DELETE

```
DELETE /api/rest/third-party-apps/objects
```

Supported attributes:

| Attribute                   | Type   | Required | Description                                             |
| --------------------------- | ------ | -------- | ------------------------------------------------------- |
| `organisationId` **(uuid)** | string | Yes      | Unique identifier for the organisation.                 |
| `ids`                       | array  | Yes      | Array of objects representing app-user associations.    |
| `ids[].appId`               | string | Yes      | Unique identifier for the app.                          |
| `ids[].userId`              | string | Yes      | Unique identifier for the user associated with the app. |

Example requests:

#### CURL:

```shell
curl
  --request DELETE \
  --url "https://admin.elba.ninja/api/rest/third-party-apps/objects" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "ids": [
      {
        "appId": "app-id",
        "userId": "user-id"
      }
    ]
  }'
```

#### elba SDK:

##### Delete the elba third party apps that has been sent before this sync

```javascript
elba.thirdPartyApps.deleteObjects({
  syncedBefore: '2023-01-01T00:00:00.000Z',
});
```

#### Delete third party apps by `appId` & `userId`

```javascript
elba.thirdPartyApps.deleteObjects({
  ids: [
    {
      appId: 'app-id-1',
      userId: 'user-id-1',
    },
  ],
});
```

Example success response:

```json
{
  "success": true
}
```
