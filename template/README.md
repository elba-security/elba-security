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

### Setting up edge-runtime integration

If your integration does supports **edge runtime** you just have to remove file ending with `.node.ts` like `src/database/client.node.ts`.

### Running the integration

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Example implementation

The template contains an example implementation that will guide you to reach our requirements. Make sure
to adapt this example to your need and remove the disclamer comments before creating your first PR.
