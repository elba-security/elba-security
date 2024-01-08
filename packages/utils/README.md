# `@elba-security/utils`

Expose a collection of utils.

## Crypto

### Requirements

- You need to have a 32 bytes key formatted in hex

You can generate a random 32 bytes hex key following this command:

```bash
openssl rand -hex 32
```

#### Code sample

```ts
import { encryptAES256GCM, decryptAES256GCM } from '@elba-security/utils';

const encryptedHex = await encryptAES256GCM({ data: 'test', keyHex: '{KEY}' });

const decrypted = await decryptAES256GCM({ dataHex: encryptedHex, keyHex: '{KEY}' });
```
