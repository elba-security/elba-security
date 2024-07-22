# Encrypting token

In order to secure organisation credentials such as the OAuth token, each sensitive data must be encrypted in the database.

Additionally, once a token has been decrypted, it should not be passed to Inngest's context.

## Requirements

The package `@elba-security/utils` must be installed. An encryption key should be generated using `openssl rand -hex 32` and set as an environnement variable named `ENCRYPTION_KEY`.

## Usage

> This section assumes that the crypto utils have been configured as in the [template](https://github.com/elba-security/elba-security/blob/staging/template/src/common/crypto.ts)

Whenever a token (`access_token`, `refresh_token`...) is inserted or updated in the database it should be encrypted.

```ts
import { encrypt } from '@/common/crypto';
import { getToken } from '@/connectors/auth';
// ...
const { accessToken, refreshToken } = await getToken(code);
const encryptedAccessToken = await encrypt(accessToken);
const encryptedRefreshToken = await encrypt(refreshToken);

await db
  .insert(Organisation)
  .values({
    id: organisationId,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    region,
  })
  .onConflictDoUpdate({
    target: Organisation.id,
    set: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    },
  });
```

To avoid passing the decrypted token to Inngest, make sure to always return the encrypted token from `step.run` and decrypt it right before using it.

```ts
import { decrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/users';
// ...
const organisation = step.run('get-organisation', async () => {
  const [row] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));
  if (!row) {
    throw new NonRetriableError('Could not retrieve organisation');
  }
  return row;
});

const nextPage = step.run('paginate', async () => {
  const result = await getUsers(await decrypt(organisation.accessToken), page);
  // ...
  return result.nextPage;
});
```

> Make sure the token is also encrypted while refreshing it.
