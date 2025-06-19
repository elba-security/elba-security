# Tableau Integration for Elba Security

This integration enables Elba Security to manage user access reviews for Tableau Server and Tableau Cloud.

## Features

- **User Synchronization**: Syncs Tableau users to Elba for access review
- **Role-Based Access Control**: Identifies administrators and regular users
- **User Suspension**: Supports removing users from Tableau sites
- **Multi-Site Support**: Works with both Tableau Server and Tableau Cloud

## Getting Started

### Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```
   ELBA_SOURCE_ID=
   NANGO_INTEGRATION_ID=
   NANGO_SECRET_KEY=
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

### Testing Setup

1. The `.env.test` file contains default test values and is committed to the repository
2. Run tests:
   ```bash
   pnpm test
   ```

## Authentication

This integration uses Tableau Personal Access Tokens (PATs) for authentication, managed through Nango.

When setting up the integration in Nango, you'll need to configure:

- Authentication type: API_KEY
- Required metadata:
  - `serverUrl`: The Tableau server URL (e.g., `https://your-server.tableau.com`)
  - `siteId`: The Tableau site ID

## User Management

### Supported Roles

The integration recognizes the following Tableau site roles:

- **Non-suspendable**: ServerAdministrator, SiteAdministratorCreator, SiteAdministratorExplorer
- **Suspendable**: Creator, Explorer, ExplorerCanPublish, Viewer, ReadOnly, Unlicensed

### User Sync

Users are synchronized from Tableau to Elba with:

- User ID, name, and email
- Suspension eligibility based on role
- Direct link to user profile in Tableau

### User Deletion

When a user is deleted through Elba, they are removed from the Tableau site using the Tableau REST API.

## API Usage

This integration uses Tableau REST API v3.15+ and includes:

- Pagination support for large user lists
- Proper error handling for authentication and API failures
- Rate limiting compliance

## Testing

Run the test suite:

```bash
pnpm test        # Run tests once
pnpm test:watch  # Run tests in watch mode
```

Run linting and type checking:

```bash
pnpm lint        # ESLint
pnpm type-check  # TypeScript compiler
```

## Deployment

The integration is deployed as a Next.js application. Ensure all environment variables are configured in your deployment platform.

## Resources

- [Tableau REST API Documentation](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm)
- [Elba Documentation](https://docs.elba.io)
- [Nango Documentation](https://docs.nango.dev)
