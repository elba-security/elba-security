# nextjs

`@elba-security/nextjs` is a set of common utils related to Next.js.

## Installation

To install `@elba-security/nextjs`, run:

```sh
pnpm add @elba-security/nextjs
```

_Make sure all peerDependencies are installed. It should be the case if you have used the template to generate the integration._

## API Reference

### Routes

#### createInstallRoute

Create an `/install` route handler that will redirect the user to the given `redirectUrl`. It set cookies for `organisation_id` & `region` using the search parameters.
When used with the option `withState: true` it set a random `state` cookie and append the `state` search parameter to the given `redirectUrl`.

**Example:**

```ts
// src/api/install/route.ts
import { createInstallRoute } from '@elba-security/nextjs';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export const GET = createInstallRoute({
  redirectUrl: env.MY_SAAS_INSTALL_URL,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  elbaSourceId: env.ELBA_SOURCE_ID,
  withState: true,
});
```

#### createOAuthRoute

Validate the response of oauth redirection with the given schema. If used with `withState: true`, it will make sure that the cookie and the response search parameter `state` has the same value.
When the response is valid it invoke the installation handler and then redirect the user to elba.
When the response is not valid or when the installation handler throw an error, it redirect the user to elba with an error message.

**Example:**

```ts
// src/api/auth/route.ts
import { createOAuthRoute } from '@elba-security/nextjs';
import { env } from '@/env';
import { handleInstallation, searchParamsSchema } from './service';

export const dynamic = 'force-dynamic';

export const GET = createOAuthRoute({
  searchParamsSchema,
  elbaRedirectUrl: env.ELBA_REDIRECT_URL,
  elbaSourceId: env.ELBA_SOURCE_ID,
  handleInstallation,
  withState: true,
});
```

```ts
// src/api/auth/service.ts
import { z } from 'zod';
import type { InstallationHandler } from '@elba-security/nextjs';
import { getToken } from '@/connectors/SaasName/auth';

export const searchParamsSchema = z.object({
  code: z.string().min(1),
});

export const handleInstallation: InstallationHandler<typeof searchParamsSchema> = async ({
  organisationId,
  region,
  searchParams: { code },
}) => {
  const token = await getToken(code);
  // proceed with the installation
  // ...
};
```

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
