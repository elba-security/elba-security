# `@elba-security/test-utils`

Expose a collection of msw request handlers that mock elba open API endpoints.

## Installation

Add `@elba-security/test-utils` in your `package.json` as a dev dependency.

```json
"devDependencies": {
  "@elba-security/test-utils": "workspace:*"
}
```

## MSW handlers

Configure the request handlers in a vitest setup file:

```ts
import { createElbaRequestHandlers } from '@elba-security/test-utils';
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
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./path/to/setupFile.ts'],
  },
});
```

## elba SDK spy

This util allows to easily spy on elba SDK in order to assert its methods calls.

_Note that it does not allows to mock the elba SDK methods. To do so, we encourage to rely on the MSW handlers. If you want to test a failing scenarios make sure the elba SDK methods are called with bad parameters._

```ts
import { spyOnElba } from '@elba-security/test-utils';
// ...

test('should do foo when baz', () => {
  const elba = spyOnElba();

  // call the function that you want to test

  // assert Elba class constructors calls
  expect(elba).toBeCalledTimes(1);
  expect(elba).toBeCalledWith({});
  // assert Elba class instance methods calls
  expect(elba.mock.results.at(0)?.value.authentication.updateObjects).toBeCalledTimes(1);
  // ...
});
```
