## Getting Started

Rename `.env.local.example` to `.env.local`.

This file will be used for local development environment.

### Setting up node integration

If your integration does not support **edge runtime** some files has to be edited:

- `docker-compose.yml`: remove the `pg_proxy` service
- `vitest/setup-msw-handlers`: remove the first arguments of `setupServer()`, setting a passthrough
- `src/database/client.ts`: replace this file by `client.node.ts` (and remove it)
- `vitest.config.js`: update `environment` to `'node'`
- `package.json`: remove dependency `"@neondatabase/serverless"`
- remove each `route.ts` exports of `preferredRegion` & `runtime` constants.

### Setting up edge-runtime integration

If your integration does supports **edge runtime** you just have to remove file ending with `.node.ts` like `src/database/client.node.ts`.

### Running the integration

First of all, ensure that the PostgreSQL database is running. You can start it by executing the following command:

```bash
pnpm database:up
```

To apply the migration, run:

```bash
pnpm database:migrate
```

Next, run the nextjs development server with the command:

```bash
pnpm dev
```

To be able to run Inngest functions, it's essential to have a local Inngest client operational. Start it using:

```bash
pnpm dev:inngest
```

_Once the Inngest client is running, it will send requests to the `localhost:4000/api/inngest` route to gather information about your functions, including events and cron triggers. Inngest also provides a user interface, accessible in your web browser, where you can monitor function invocations, attempt retries, and more._

### Database migrations

To create a new migration file within the `/drizzle` directory, execute the following command:

```bash
pnpm database:generate
```

After generating the migration, apply it by running:

```bash
pnpm database:migrate
```

Important Considerations:

- **Single Migration Requirement**: Your integration should include only one migration before merging into the staging environment. If you need to regenerate the contents of your `/drizzle` folder, ensure that you delete the existing folder first.

- **Handling drizzle-orm Errors**: In cases where `drizzle-orm` encounters an error during the migration process, it's advisable to unmount and remount your database container. This can be achieved with the `database:down` and `database:up` commands, respectively. Once this is done, you can attempt the migration again.

### Example implementation

The template contains an example implementation that will guide you to reach our requirements. Make sure
to adapt this example to your need and remove the disclamer comments before creating your first PR.
