# Contributing to _elba-security_

The following is a set of guidelines for contributing to **elba-security** and its packages.

## What should I know before I get started?

### Project Architecture

This project is a monorepo that uses [Turborepo](https://turbo.build/repo).
Each SaaS integration has its own nextjs app located in `/apps/{SaaS}`. The folder `/packages` contains shared tools and configuration.

### Important Resources

- **Docs**: [learn more about our Open API and how to start a new SaaS integration.](https://elba-security.readme.io/reference/getting-started-with-your-api)
- **Slack**: [ask for support.](https://elbahqworkspace.slack.com)

## How to start ?

### Prerequisites

Before you begin, ensure that you have the following installed on your machine:

- **Node.js**: **elba-security** requires Node.js to run. You can download it from [the official Node.js website](https://nodejs.org/).
- **pnpm**: We use `pnpm` for managing package dependencies. It needs to be installed globally on your machine.

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
