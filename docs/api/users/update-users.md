
## Update users
This endpoint is used to add multiple users to a specified organisation in the Elba system.

### POST User Data

> Version 1.0

This method allows for the addition of multiple users to an organisation using their unique identifiers and other personal details.

```plaintext
POST /api/rest/users
```

Supported attributes:

| Attribute                | Type     | Required | Description                                  |
|--------------------------|----------|----------|----------------------------------------------|
| `organisationId` **(uuid)**        | string   | Yes      | Unique identifier for the organisation.      |
| `sourceId`  **(uuid)**             | string   | Yes      | Unique source identifier for tracking.       |
| `users`                  | array    | Yes      | Array of user objects to be added.           |
| `users[].id`             | string   | Yes      | Unique identifier for the user.              |
| `users[].email`          | string   | Yes      | Email address of the user.                   |
| `users[].displayName`    | string   | Yes      | Display name of the user.                    |
| `users[].additionalEmails`| array  | No       | List of additional email addresses.         |
| `role`              | string   | No      | User role (`admin`, `user`, etc..)      |
| `authMethod`               | string   | No      | User auth method (`mfa`,`password`,`sos`)|

If successful and the organisation is found, returns [`200`](rest/index.md#status-codes) and the following response attributes:

Example requests:
### CURL
```shell
curl --request POST \
  --url "https://api.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "X-elba-Api-Key: ELBA_API_KEY" \
  --data '{
    "organisationId": "organisation-id",
    "sourceId": "source-id",
    "users": [
      {
        "id": "user-source-id",
        "email": "user-primary-email@foo.com",
        "displayName": "user display name",
        "additionalEmails": ["email-1@foo.com", "email-2@bar.com"]
      },
    ]
  }'
```

### Elba Sdk
```javascript
import { Elba } from '@elba-security/sdk'
import { inngest } from '@/inngest/client';
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

  const elba = new Elba({
    organisationId,
    sourceId: 'source-id',
    apiKey: 'elba-api-key',
    baseUrl: 'elba-base-url',
    region,
  });

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
}

```
Successful response:

| Attribute                | Type     | Description                          |
|--------------------------|----------|--------------------------------------|
| `insertedOrUpdatedCount` | number   | Number of users inserted or updated. |
| `message`               | string   | Description of the operation result.  |

```json
{
  "updateSourceUsers": {
    "insertedOrUpdatedCount": 1,
    "message": "Source users updated successfully"
  }
}
```
