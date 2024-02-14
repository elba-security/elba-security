# nextjs

`@elba-security/nextjs` is a set of common utils related to Next.js.

## Installation

To install `@elba-security/nextjs`, run:

```sh
pnpm add @elba-security/nextjs
```

_Make sure all peerDependencies are installed. It should be the case if you have used the template to generate the integration._

## API Reference

### Middleware

#### createElbaMiddleware

This helper provide a quick way to create a Next.js middleware that will authenticate elba's request made against the integration elba webhook endpoints.

**Example:**

```ts
// src/middleware.ts
import { createElbaMiddleware } from '@elba-security/nextjs';
import { env } from '@/env';

export const middleware = createElbaMiddleware({
  webhookSecret: env.ELBA_WEBHOOK_SECRET,
});
```

### Redirection

#### ElbaInstallRedirectResponse

This class will create a response redirecting the client to elba when the integration installation succeed or not. Note that it handle an edge case: when the `region` is not given, the status will be `500` as we are not able to make the redirection URL without it.

The `error` option is optionnal and should not be set when the installation process succeed.

**JSON payload example:**

```ts
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';

// ...
return new ElbaInstallRedirectResponse({
  // error: 'unauthorized'
  region,
  sourceId: env.ELBA_SOURCE_ID,
  baseUrl: env.ELBA_REDIRECT_URL,
});
```
