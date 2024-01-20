## Delete Data Protection Objects
This endpoint is designated for the deletion of data protection objects within an organisation in the Elba system. It can be invoked with either `ids` or `syncedBefore`, but not both simultaneously.

### DELETE Data Protection Object

> Version 1.0

This method allows for the deletion of specific data protection objects or objects synced before a certain timestamp. The choice between `ids` and `syncedBefore` depends on the operational context.

- **Use `ids` when:**
  - Reacting to a delete event in webhook mode.
  - The refresh object webhook could not find the object.

- **Use `syncedBefore` when:**
  - Performing a state of the world update, to remove previous versions of objects after sending the last batch of updated objects.

```plaintext
DELETE /api/rest/data-protection-objects
```

Supported attributes:

| Attribute                | Type      | Required | Description                                       |
|--------------------------|-----------|----------|---------------------------------------------------|
| `organisationId`  **(uuid)**        | string      | Yes      | Unique identifier for the organisation.           |
| `sourceId`    **(uuid)**            | string      | Yes      | Unique source identifier for tracking.            |
| `ids`                    | array     | Conditional | Array of object identifiers to be deleted.    |
| `syncedBefore`           | datetime  | Conditional | Timestamp to delete objects synced before this time. |

The request should contain either `ids` or `syncedBefore`, but not both.

Example request for deletion by `ids`:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/data-protection-objects" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-uuid",
    "sourceId": "source-uuid",
    "ids": [{
        "id": "file-id",
        "userId": "user-id"
    }]
  }'
```

Example request for deletion by `syncedBefore`:

```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/data-protection-objects" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-uuid",
    "sourceId": "source-uuid",
    "syncedBefore": "2023-06-06T13:50:07.138Z"
  }'
```

### Elba SDK Example:

To delete data protection objects using the Elba SDK.

```javascript
export const runDateProtectionAppsSyncJobs = inngest.createFunction(
  { event: 'third-party-apps/run-sync-jobs' },
  async ({ event, step }) => {
  const { organisationId, syncStartedAt, cursor, region } = event.data;

  step.run('start-data-protection-sync', async () => {
      // logics ..
  });

  // delete the elba data protection that has been sent before this sync
   await step.run('finalize-data-protection-sync', async () => {
    return elba.dataProtection.deleteObjects({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });

  // OR
  // Based on your logic you can specifically provide the user ids & object ids to delete
  // Note: you are not allowed to use both methods together
   await step.run('finalize-third-party-apps-sync', async () => {
    return elba.dataProtection.deleteObjects({
      ids: [
        {
            id: 'object-id-1',
            userId: 'user-id-1'
        }
      ]
    });
  });

```