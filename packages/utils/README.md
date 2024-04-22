# `@elba-security/utils`

Expose a collection of utils.

## Crypto

### Requirements

- You need to have a 32 bytes key formatted in hex

You can generate a random 32 bytes hex key following this command:

```bash
openssl rand -hex 32
```

- (Optional) If you need to generate consistent encrypted values you will need to specify an IV. It will need to be a 16 bytes IV formatted in hex.

You can generate a random 16 bytes hex key following this command:

```bash
openssl rand -hex 16
```

#### Code sample

```ts
import { encryptText, decryptText } from '@elba-security/utils';

// Without specifying IV, IV will be randomly generated
const encrypted = await encryptText({ data: 'test', key: '{KEY}' });

// By specifying an IV
const encrypted = await encryptText({ data: 'test', key: '{KEY}', iv: '{IV}' });

const decrypted = await decryptText({ data: encrypted, key: '{KEY}' });
```
