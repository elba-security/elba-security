## Delete Data Protection Objects

This endpoint is designated for the deletion of data protection objects within an organisation in the Elba system. It can be invoked with either `ids` or `syncedBefore`, but not both simultaneously.

### DELETE

This method allows for the deletion of specific data protection objects or objects synced before a certain timestamp. The choice between `ids` and `syncedBefore` depends on the operational context.

```plaintext
DELETE /api/rest/data-protection/objects
```

Supported attributes:

| Attribute                   | Type     | Required    | Description                                          |
| --------------------------- | -------- | ----------- | ---------------------------------------------------- |
| `organisationId` **(uuid)** | string   | Yes         | Unique identifier for the organisation.              |
| `ids`                       | array    | Conditional | Array of object identifiers to be deleted.           |
| `syncedBefore`              | datetime | Conditional | Timestamp to delete objects synced before this time. |

The request should contain either `ids` or `syncedBefore`, but not both.

Example request for deletion by `ids`:

#### CURL:

```shell
curl
  --request DELETE \
  --url "https://admin.elba.ninja/api/rest/data-protection/objects" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-uuid",
    "ids": ["object-id-1", "object-id-2"]
  }'
```

Example request for deletion by `syncedBefore`:

```shell
curl
  --request DELETE \
  --url "https://admin.elba.ninja/api/rest/data-protection/objects" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "syncedBefore": "2023-06-06T13:50:07.138Z"
  }'
```

#### elba SDK:

Example request for deletion by `ids`:

```javascript
elba.dataProtection.deleteObjects({
  syncedBefore: '2023-01-01T00:00:00.000Z',
});
```

Example request for deletion by `syncedBefore`:

```javascript
elba.dataProtection.deleteObjects({ ids: objectIds });
```
