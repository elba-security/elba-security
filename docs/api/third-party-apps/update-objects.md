## Update Third-Party Apps

This endpoint facilitates the updating of third-party app information within an organisation in the Elba system.

### POST

This method allows for updating details of third-party applications associated with an organisation, including app details and associated users.

```plaintext
POST /api/rest/third-party-apps/objects
```

Supported attributes:

| Attribute                       | Type     | Required | Description                                                                 |
| ------------------------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `organisationId` **(uuid)**     | string   | Yes      | Unique identifier for the organisation.                                     |
| `apps`                          | array    | Yes      | Array of third-party app objects to be updated.                             |
| `apps[].id`                     | string   | Yes      | Unique identifier for the app.                                              |
| `apps[].name`                   | string   | Yes      | Name of the app.                                                            |
| `apps[].description`            | string   | No       | Description of the app.                                                     |
| `apps[].logoUrl`                | string   | No       | URL of the app's logo.                                                      |
| `apps[].url`                    | string   | No       | URL of the app.                                                             |
| `apps[].publisherName`          | string   | No       | Name of the app's publisher.                                                |
| `apps[].users`                  | array    | Yes      | Array of users associated with the app.                                     |
| `apps[].users[].id`             | string   | Yes      | Unique identifier for the user.                                             |
| `apps[].users[].scopes`         | array    | No       | Scopes associated with the user for this app, Ex: `['scope-1', 'scope-2']`. |
| `apps[].users[].createdAt`      | datetime | No       | Creation date of the user's association with the app.                       |
| `apps[].users[].lastAccessedAt` | datetime | No       | Last access date of the user for this app.                                  |
| `apps[].users[].metadata`       | object   | No       | Last access date of the user for this app.                                  |

Example requests:

#### CURL:

```shell
curl
  --request POST \
  --url "https://admin.elba.ninja/api/rest/third-party-apps/objects" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --data '{
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

#### elba SDK:

```javascript
elba.thirdPartyApps.updateObjects({ apps: thirdPartyApps });
```

Successful response:

| Attribute             | Type   | Description                           |
| --------------------- | ------ | ------------------------------------- |
| `message`             | number | Description of the operation result.  |
| `data`                | object | Details of the processed apps & users |
| `data.processedApps`  | number | Number of processed apps              |
| `data.processedUsers` | number | Number of processed users             |
