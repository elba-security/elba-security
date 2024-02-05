## Update Data Protection Objects

This endpoint enables updating information about data protection objects associated with an organization in the Elba system, with specific attention to permissions and their validation.

### POST

This method allows for updating details of data protection objects

```
POST /api/rest/data-protection/objects
```

Supported attributes:

| Attribute                             | Type     | Required | Description                                                  |
| ------------------------------------- | -------- | -------- | ------------------------------------------------------------ |
| `organisationId` **(uuid)**           | string   | Yes      | Unique identifier for the organisation.                      |
| `objects`                             | array    | Yes      | Array of data protection objects to be updated.              |
| `objects[].id`                        | string   | Yes      | Unique identifier for the data protection object.            |
| `objects[].name`                      | string   | Yes      | Name of the object.                                          |
| `objects[].ownerId`                   | string   | Yes      | Unique identifier for the owner of the object.               |
| `objects[].url`                       | string   | Yes      | URL of the object.                                           |
| `objects[].contentHash`               | string   | No       | Hash of the object's content.                                |
| `objects[].metadata`                  | object   | No       | Metadata associated with the object.                         |
| `objects[].lastAccessedAt`            | datetime | No       | Timestamp of last access.                                    |
| `objects[].isSensitive`               | boolean  | No       | Indicates if the object contains sensitive information.      |
| `objects[].updatedAt`                 | datetime | No       | Timestamp of last update.                                    |
| `objects[].permissions`               | array    | Yes      | Permissions associated with the object.                      |
| `objects[].permissions[].id`          | string   | Yes      | Identifier for the permission.                               |
| `objects[].permissions[].type`        | string   | Yes      | Type of permission (e.g., user, domain, anyone).             |
| `objects[].permissions[].email`       | string   | No       | Email associated with the user permission (for type 'user'). |
| `objects[].permissions[].userId`      | string   | No       | User ID (for type 'user' with userId and displayName).       |
| `objects[].permissions[].displayName` | string   | No       | Display name (for type 'user' with userId and displayName).  |
| `objects[].permissions[].domain`      | string   | No       | Domain associated with the permission (for type 'domain').   |
| `objects[].permissions[].metadata`    | object   | No       | Metadata about the specific permission.                      |

Example requests:

#### CURL:

```shell
curl
  --request POST \
  --url "https://admin.elba.ninja/api/rest/data-protection/objects" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --data '{
    "organisationId": "organisation-id",
    "objects": [
        "id": "file-id",
        "name": "name-of-the-file",
        "ownerId": "owner-id-of-the-file",
        "url": "https://alpha.com/file-id",
        "contentHash": null,
        "metadata": {
          // Metadata can be contain any important data of the file that you want to store,
        },
        "lastAccessedAt": "2021-03-03T10:00:00.000Z",
        "isSensitive": false,
        "updatedAt": "2021-03-03T10:00:00.000Z",
        "permissions": [
        {
          "id": "permission-id-1",
          "type": "domain",
          "domain": "alpha.com",
        },
        {
          "id": "permission-id-2",
          "type": "user",
          "email": "user-email-id@alpha.com",
        },
        {
          "id": "permission-id-2",
          "type": "user",
          "userId": "user-id",
          "displayName": "display-name-of-the-user",
        },
        {
          "id": "permission-id-3",
          "type": "anyone",
          "metadata": {
            // Metadata can be contain any important data that you want to store about the specific permission
            // Example:
            "sharedLinks": [
              "https//link-1.com/anyone-1",
              "https//link-1.com/anyone-2"
            ]
          },
        },
      ]
    ]
  }'
```

#### Elba SDK:

```javascript
elba.dataProtection.updateObjects({ objects });
```

Example success response:

```json
{
  "success": true
}
```

### Type of permissions:

> [!NOTE]  
> There are three types of permissions

1. `user` - this permission accepts two different types of object below

```json
{
  "id": "permission-id-2",
  "type": "user",
  "email": "user-email-id@alpha.com",
}

or

{
  "id": "permission-id-2",
  "type": "user",
  "userId": "user-id",
  "displayName": "display-name-of-the-user",
}
```

2. `domain`

```json
{
  "id": "permission-id-1",
  "type": "domain",
  "domain": "alpha.com",
},
```

3. `anyone`

```json
{
  "id": "permission-id-3",
  "type": "anyone",
  "metadata": {
    // Metadata can contain any important data that you want to store about the specific permission
    // Example:
    "sharedLinks": [
      "https//link-1.com/anyone-1",
      "https//link-1.com/anyone-2"
    ]
  },
},
```
