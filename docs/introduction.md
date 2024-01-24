### Introduction
You can interact with the API through HTTP requests via Elba REST end points or our Elba sdk,

To install the official SDK, run the following command.

```shell
pnpm add @elba-security/sdk
```

### Authentication
The Elba API uses API key for authentication, developer console will be available soon to generate the API however, at the moment the API key will be provided on request.

Remember that your API key is a secret! Do not share it with others or expose it in any client-side code (browsers, apps). API key must be securely stored in the sever and it should be loaded form an environment variable or key management service.


All API requests should include your API key in an Authorization HTTP header as follows:
```shell
X-elba-Api-Key: ELBA_API_KEY
```

Example curl request:
```shell
curl --header "X-elba-Api-Key: ELBA_API_KEY" \
  --request DELETE \
  --url "https://api.elba.ninja/api/rest/third-party-apps/objects" \
  --header "Content-Type: application/json" \
  --data '{
    "organisationId": "organisation-id",
    "sourceId": "source-id",
    "ids": [
      {
        "appId": "app-id",
        "userId": "user-id"
      }
    ]
  }'
```

Example with Elba SDK:
```javascript
import { Elba } from '@elba-security/sdk'

const elba = new Elba({
    apiKey: 'elba-api-key',
    organisationId: 'organisation-id',
    sourceId: 'source-id',
    region: 'eu',
});

elba.users.update({ users })

```
