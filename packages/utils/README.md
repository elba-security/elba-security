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
import { encryptText, decryptText } from '@elba-security/utils';

const encrypted = await encryptText('test', '{KEY}');

const decrypted = await decryptText(encrypted, '{KEY}');
```
