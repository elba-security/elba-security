# `elba-msw`

Expose a collection of msw request handlers that mock elba open API endpoints.

## Usage

Add `elba-msw` in your `package.json` as a dev dependency.

```json
"devDependencies": {
  "elba-msw": "workspace:*"
}
```

Next, configure the request handlers in a vitest setup file:

```ts
import { createElbaRequestHandlers } from 'elba-msw';
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';

const elbaRequestHandlers = createElbaRequestHandlers('https://base.io/url', 'api-key');

const server = setupServer(
  ...elbaRequestHandlers
  // ...otherRequestHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
```

Note that if you don't have any vitest setup files configured, make sure to set `setupFile` in `vitest.config.js`:

```js
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    setupFiles: ['./path/to/setupFile.ts'],
  },
});
```
