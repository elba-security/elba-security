## Delete users

This endpoint enables the removal of users from a specified organisation in the Elba system using either their unique identifiers or a date criterion.

### DELETE User Data

> Version 1.0

This method supports the deletion of users from an organisation by specifying either a list of user IDs or a `syncedBefore` timestamp. Note that `ids` and `syncedBefore` should not be provided simultaneously.

```plaintext
DELETE /api/rest/users
```

Supported attributes:

| Attribute                | Type         | Required | Description                                        |
|--------------------------|--------------|----------|----------------------------------------------------|
| `organisationId`         | string       | Yes      | Unique identifier for the organisation.            |
| `ids`                    | array(string)| No       | Array of user identifiers to be deleted.           |
| `syncedBefore`           | datetime     | No       | Timestamp to delete users synced before this time. |

Note: `ids` and `syncedBefore` are mutually exclusive and should not be provided together.

If successful, returns [`200`](rest/index.md#status-codes) and the following response attributes:

| Attribute                | Type     | Description                          |
|--------------------------|----------|--------------------------------------|
| `success`                | boolean  | Indicates if the operation succeeded.|

Example request for deletion by user IDs:

```shell
curl --request DELETE \
  --url "https://api.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "X-elba-Api-Key: ELBA_API_KEY" \
  --data '{
    "organisationId": "organisation_id",
    "ids": ["user-id-1", "user-id-2"]
  }'
```

Example request for deletion by `syncedBefore`:

```shell
curl --header "PRIVATE-TOKEN: <your_access_token>" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "X-elba-Api-Key: ELBA_API_KEY" \
  --data '{
    "organisationId": "organisation_id",
    "syncedBefore": "2023-06-06T13:50:07.138Z"
  }'
```

### Elba Sdk

```javascript
import { Elba } from '@elba-security/sdk'
import { type MySaasUser, getUsers } from '@/connectors/users';

const formatElbaUser = (user: MySaasUser): User => ({
  id: user.id,
  displayName: user.username,
  email: user.email,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  { event: 'users/sync_page.triggered' },
  async ({ event, step }) => {;

  const { organisationId, syncStartedAt, page, region } = event.data;
  step.run('start-user-sync', async () => {
      // retrieve this users page
      const result = await getUsers(token, page);
      // format each SaaS users to elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      await elba.users.update({ users });
  });

  // delete the elba users that has been sent before this sync
  await step.run('finalize-user-sync', () =>
    elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
  );

  // OR
  // Based on your logic you can specifically provide the user ids to delete
  // Note: you are not allowed to use both methods together
  await step.run('finalize-user-sync', () =>
    elba.users.delete({ ids: ['source-user-id-1', 'source-user-id-2'] })
  );
}

```


Example success response:

```json
{
  "success": true
}
```