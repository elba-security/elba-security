## Update users

This endpoint is used to add multiple users to a specified organisation in the Elba system.

### POST

This method allows for the addition of multiple users to an organisation using their unique identifiers and other personal details.

```
POST /api/rest/users
```

Supported attributes:

| Attribute                   | Type   | Required | Description                                       |
| --------------------------- | ------ | -------- | ------------------------------------------------- |
| `organisationId` **(uuid)** | string | Yes      | Unique identifier for the organisation.           |
| `users`                     | array  | Yes      | Array of user objects to be added.                |
| `users[].id`                | string | Yes      | Unique identifier for the user.                   |
| `users[].email`             | string | Yes      | Email address of the user.                        |
| `users[].displayName`       | string | Yes      | Display name of the user.                         |
| `users[].additionalEmails`  | array  | No       | List of additional email addresses.               |
| `users[].role`              | string | No       | User role                                         |
| `users[].authMethod`        | string | No       | User auth method - `"mfa"`, `"password"`, `"sso"` |

If successful and the organisation is found, returns [`200`](rest/index.md#status-codes) and the following response attributes:

Example requests:

#### CURL:

```shell
curl --request POST \
  --url "https://admin.elba.ninja/api/rest/users" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
  --data '{
    "organisationId": "organisation-id",
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

#### elba SDK:

```javascript
elba.users.update({ users });
```

Successful response:

| Attribute                | Type   | Description                          |
| ------------------------ | ------ | ------------------------------------ |
| `insertedOrUpdatedCount` | number | Number of users inserted or updated. |
| `message`                | string | Description of the operation result. |

```json
{
  "updateSourceUsers": {
    "insertedOrUpdatedCount": 1,
    "message": "Source users updated successfully"
  }
}
```
