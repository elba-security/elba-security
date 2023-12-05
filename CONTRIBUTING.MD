# Contributing to _elba-security_

The following is a set of guidelines for contributing to **elba-security** and its packages.

## What should I know before I get started?

### Project Architecture

This project is a monorepo that uses [Turborepo](https://turbo.build/repo).
Each SaaS integration has its own nextjs app located in `/apps/{SaaS}`. The folder `/packages` contains shared tools and configuration.

### Required tools

#### `postgres`

As Vercel offers storage hosting, we chose to select one of the supported databases. While a relational database was not a requirement, some integrations could benefit from this feature.

#### `drizzle-orm`

We are requiring the use of [`drizzle-orm`](https://orm.drizzle.team/docs/overview), which provides type safety and migration generation. Unlike the `@vercel/postgres` utility `sql` used alone, it allows for local database usage.

### `inngest`

We use [`inngest`](https://inngest.com/) for its efficient handling of event-driven architectures and serverless functions, enabling us to easily create and manage responsive workflows.

#### `vitest`

We also require [`vitest`](https://vitest.dev/) as the test runner for several reasons. It is well-maintained, and its configuration is less tricky than that for `jest`. Additionally, it is faster.

If you are familiar with `jest`, you will quickly adapt to `vitest`, as both APIs are very similar.

### Important Resources

- **Docs**: [learn more about our Open API and how to start a new SaaS integration.](https://elba-security.readme.io/reference/getting-started-with-your-api)
- **Slack**: [ask for support.](https://elbahqworkspace.slack.com)

## How to start ?

### Prerequisites

Before you begin, ensure that you have the following installed on your machine:

- **Node.js**: **elba-security** requires Node.js to run. You can download it from [the official Node.js website](https://nodejs.org/).
- **pnpm**: We use `pnpm` for managing package dependencies. It needs to be installed globally on your machine.
- **docker**: We use `docker` to host a local postgres instance. You can download it from [the official Docker website](https://www.docker.com/products/docker-desktop/).

### Starting a New SaaS Integration

Once you have the prerequisites installed, you're ready to create a new SaaS integration. Here's how you can do it:

1. Navigate to the Integrations Directory:

Change to the `apps/` directory where our SaaS integrations live:

```bash
cd apps/
```

2. Create a New Next.js Application:

You'll be using our custom Next.js template to create a new app. When running the command below, make sure to replace `{SaaS}` with the name of the SaaS you're integrating, formatted in [kebab-case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles) (all lowercase, words separated by hyphens).

Run the following command to create a new Next.js app:

```bash
pnpm create next-app {SaaS} -e https://github.com/elba-security/elba-security/tree/staging/template
```

For example, if you're adding an integration for _"Awesome Service"_, you would run:

```bash
pnpm create next-app awesome-service -e https://github.com/elba-security/elba-security/tree/staging/template
```

> Don't forget to read the `README.md` file generated at the root of your integration folder.

## How to implement tests ?

_The template provides an example implementation of authentication and user syncing processes. It is fully tested and offers a clear perspective on how we intend the tests to be implemented._

### Elba API Mocks

The package elba-msw should be used to mock the Elba Open API during unit tests. It validates request payloads against schemas. In your tests, there is no need to expect calls against the Elba Open API.

_Note that elba-msw is already configured in the template._

### Mocking SaaS APIs

If the integration performs HTTP requests directly, without using an SDK, you should implement your own msw handlers.

### Mocking SaaS SDK

Mocking each endpoint correctly using msw can be challenging if the integration uses an SDK. In such cases, we suggest mocking the SDK package using vi.mock.

### Running the Tests

First, ensure that your local PostgreSQL instance is running.
To start it, type the following command in your integration directory:

```bash
pnpm test:database
```

Once the database is up and running, tests can be started using:

```bash
pnpm test
```

### Writting the tests

The tests should cover the `service.ts` files and account for various behaviors: success, failure, and abortion.

Each test for a function should be enclosed within a describe block. The description for each test case should adhere to the following pattern:

> **should** _do foo and bar_ **when** biz is false

**example**:

```ts
describe('myFunction', () => {
  test('should return "foo" when biz is false', () => {
    // ...
  });
  test('should return "bar" when biz is true', () => {
    // ...
  });
});
```

If the function being tested involves _getting_, _removing_, _updating_ or _adding_ something in the database, the test should expect the actual modification to occur.

**example**:

```ts
import { db } from '@/database/client';
// ...
test('should register the organisation when the oauth flow succeed', async () => {
  await expect(registerOrganisation('org-id')).resolves.toStrictEqual({ success: true });
  await expect(db.select().from(Organisation)).resolves.toMatchObject([
    {
      id: 'org-id',
    },
  ]);
});
```

_Note that you can insert entries in the database before calling your function._
