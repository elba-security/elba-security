## Update Data Protection Objects
This endpoint enables updating information about data protection objects associated with an organization in the Elba system, with specific attention to permissions and their validation.

### POST Data Protection Object Update

> Version 1.0

This method allows for updating details of data protection objects

```plaintext
POST /api/rest/data-protection-objects
```

Supported attributes:

| Attribute                   | Type      | Required | Description                                                 |
|-----------------------------|-----------|----------|-------------------------------------------------------------|
| `organisationId`            | string    | Yes      | Unique identifier for the organisation.                     |
| `sourceId`                  | string    | Yes      | Unique source identifier for tracking.                      |
| `objects`                   | array     | Yes      | Array of data protection objects to be updated.             |
| `objects[].id`              | string    | Yes      | Unique identifier for the data protection object.           |
| `objects[].name`            | string    | Yes      | Name of the object.                                         |
| `objects[].ownerId`         | string    | Yes      | Unique identifier for the owner of the object.              |
| `objects[].url`             | string    | Yes      | URL of the object.                                          |
| `objects[].contentHash`     | string    | No       | Hash of the object's content.                               |
| `objects[].metadata`        | object    | Yes      | Metadata associated with the object.                        |
| `objects[].lastAccessedAt`  | datetime  | No       | Timestamp of last access.                                   |
| `objects[].isSensitive`     | boolean   | No       | Indicates if the object contains sensitive information.     |
| `objects[].updatedAt`       | datetime  | No       | Timestamp of last update.                                   |
| `objects[].permissions`     | array     | Yes      | Permissions associated with the object.                     |
| `objects[].permissions[].id`| string    | Yes      | Identifier for the permission.                              |
| `objects[].permissions[].type`| string  | Yes      | Type of permission (e.g., user, domain, anyone).            |
| `objects[].permissions[].email`| string | No       | Email associated with the user permission (for type 'user').|
| `objects[].permissions[].userId`| string| No       | User ID (for type 'user' with userId and displayName).      |
| `objects[].permissions[].displayName`| string| No  | Display name (for type 'user' with userId and displayName). |
| `objects[].permissions[].domain`| string| No       | Domain associated with the permission (for type 'domain').  |
| `objects[].permissions[].metadata`| object| Yes    | Metadata about the specific permission.                     |


Example request:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request POST \
  --url "https://api.elba.ninja/api/rest/data-protection-objects" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "sourceId": "source-id",
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
          "metadata": {},
        },
        {
          "id": "permission-id-2",
          "type": "user",
          "email": "user-email-id@alpha.com",
          "metadata": {},
        },
        {
          "id": "permission-id-2",
          "type": "user",
          "userId": "user-id",
          "displayName": "display-name-of-the-user",
          "metadata": {}
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

### Elba SDK Example

To update data protection objects using the Elba SDK, the following JavaScript code can be used:

### Elba Sdk
```javascript
import { Elba } from '@elba-security/sdk'
import { type MySaasDataProtection, getThirdPartyApps, type SourcePermission } from '@/connectors/data-protection';

const formatPermissions = (permissions: SourcePermission[]) => {
 return permissions.map(({id, permissionEmail, type }) => {
  return {
    id,
    email: permissionEmail
    type
    // rest of the permission details based on the type
    ...
    ...
  }
 })
}

const formatElbaObjects = (object: MySaasDataProtection) => ({
    id: object.id,
    name: object.name,
    ownerId: object.owner.id,
    url: object.previewUrl,
    contentHash: object.hash,
    publisherName: app.publisherName,
    metadata: {
      isPersonal: object.isPersonal
    }
    lastAccessedAt: "2021-03-03T10:00:00.000Z",
    isSensitive: false,
    updatedAt: "2021-03-03T10:00:00.000Z",
    permissions: formatPermissions(object.permissions)
});

export const runThirdPartyAppsSyncJobs = inngest.createFunction(
  { event: 'data-protection/run-sync-jobs' },
  async ({ event, step }) => {
  const { organisationId, syncStartedAt, cursor, region } = event.data;

  const elba = new Elba({
    organisationId,
    sourceId: 'source-id',
    apiKey: 'elba-api-key',
    baseUrl: 'elba-base-url',
    region,
  });

  step.run('start-data-protection-sync', async () => {
      // retrieve all the connected third party apps by the team members
      const result = await getFolderAndFiles(token, cursor);
      // format each SaaS third party apps to elba apps
      const objectsToSend = result.apps.map(formatElbaObjects);
      // send the batch of third party apps to elba
      await elba.dataProtection.updateObjects({ objects: objectsToSend});
  });

  // delete the elba data protection objects that has been sent before this sync
   await step.run('finalize-data-protection-sync', async () => {
    return elba.dataProtection.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

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
1. `user` -  this permission accepts two different types of object below

```json
{
  "id": "permission-id-2",
  "type": "user",
  "email": "user-email-id@alpha.com",
  "metadata": {
    // Metadata can be contain any important data that you want to store about the specific permission
  },
}

or

{
  "id": "permission-id-2",
  "type": "user",
  "userId": "user-id",
  "displayName": "display-name-of-the-user",
  "metadata": {}
}
```

2. `domain`

```json
{
  "id": "permission-id-1",
  "type": "domain",
  "domain": "alpha.com",
  "metadata": {},
},
```

3. `anyone` 

```json
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
```



