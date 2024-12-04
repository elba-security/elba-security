## Get organisations

This endpoint is used to get organisations with an active integration connection.

### GET

This method allows to get a list of active organisations identifiers.

```text
GET /api/rest/organisations
```

If successful, returns [`200`](rest/index.md#status-codes) and the following response attributes:

Example requests:

#### CURL

```shell
curl --request POST \
  --url "https://admin.elba.ninja/api/rest/organisations" \
  --header "Authorization: Bearer <ELBA_API_KEY>" \
```

#### elba SDK

```javascript
elba.organisations.list();
```

Successful response:

| Attribute                           | Type   | Description                            |
| ----------------------------------- | ------ | -------------------------------------- |
| `organisations[].id` **(uuid)**     | string | The organisation ID.                   |
| `organisations[].nangoConnectionId` | string | The Nango connection ID. Can be `null` |

```json
{
  "organisations": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "nangoConnectionId": null
    }
  ]
}
```
