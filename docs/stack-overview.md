# Stack overview

We will go over our tools and architecture and explain to you what we have in mind for our integrations marketplace here at elba.

For every package listed here, there will be a mention of either :

- Required
- Recommended

Everything that's not labeled "Required" can be changed to better suit your needs as a developer and make your experience as comfortable as possible.

## Provider

### Vercel (Required)

[Vercel](https://vercel.com/docs/getting-started-with-vercel) is a platform that provides tools, workflows and infrastructure to easily build our apps and deploy them on the Edge runtime.

## Web framework

### Next.js (Required)

[Next.js](https://nextjs.org/docs) is a React framework for building full-stack web applications. You use React Components to build user interfaces, and Next.js for additional features and optimizations. This framework is tightly coupled with Vercel, which allows for smooth deployments.

## Package management

### pnpm (Required)

[pnpm](https://pnpm.io) is basically npm on steroids with lots of optimizations regarding speed and storage. Every command you used to do with npm, you can basically do the same except that you have to prefix it with `pnpm` instead of `npm`.

### TurboRepo (Required)

[TurboRepo](https://turbo.build/repo/docs) is a build system that allows for better package caching and monorepository handling.

## Event queue

### Inngest (Required)

[Inngest](https://www.inngest.com/docs) is an event-driven durable workflow engine that enables you to run reliable code on any platform, including serverless.

Thanks to Inngest, we can run asynchronous workflow that will allow us to synchronize different resources needed for our integrations to work.

## Database

### Vercel Postgres (Required)

Since we are using Vercel, we decided to choose [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) which is their newly made integration that allows to easily serve a database for a given project on Vercel.

### PostgreSQL (Required)

We decided to opt for PostgreSQL for our database since we will be using Vercel Postgres, a homemade integration from Vercel that easily provides a database for all of our integrations.

### Drizzle (Recommended)

Regarding the ORM, we went for [Drizzle](https://orm.drizzle.team/docs/overview), a Typescript ORM that allows you to easily interact with your database within the codebase.

If you have another ORM of choice that works fine with PostgreSQL (especially Vercel Postgres), feel free to use it and make changes according to your needs.

## Virtualization

### Docker Compose (Required)

[Docker Compose](https://docs.docker.com/compose/install/) is an orchestration tool derived from Docker that allows you to deploy and manage virtual containers which are runnable instances of images such as a database, a Linux OS, etc.
This comes in handy especially when it comes to deploy our stack locally.
