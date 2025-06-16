<img width="1280" alt="GitHub" src="https://github.com/user-attachments/assets/d2695260-ae07-4fa2-9bbe-a98f85ad3cfe" />

# elba security

## Overview

This repository is the hub for elba's integrations, providing middleware between various SaaS platforms and elba's security platform.

### Core Features

- **User Synchronization**: Automatic user data collection and updates from SaaS platforms
- **OAuth Authentication**: Secure authentication flow using [Nango](https://nango.dev/)
- **Event-Driven Architecture**: Reliable event handling with [Inngest](https://www.inngest.com/)
- **Type Safety**: Full TypeScript support with proper type definitions
- **Testing**: Comprehensive test setup with Vitest

### Integration Capabilities

Each integration:

1. **Collects User Data**: Fetches users and their permissions from SaaS platforms
2. **Transforms Data**: Converts platform-specific formats to elba's format
3. **Maintains Sync**: Keeps data updated through initial and periodic syncs
4. **Handles Events**: Processes webhooks for real-time updates
5. **Manages Errors**: Provides robust error handling and reporting

## Getting Started

### Prerequisites

- Node.js v22
- pnpm

### Creating a New Integration

1. Clone the repository:

   ```bash
   git clone https://github.com/elba-security/elba-security.git
   cd elba-security
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Generate a new integration:

   ```bash
   pnpm generate
   ```

4. Follow the integration-specific README in your generated app directory.

## Available Integrations

We support integrations with the following SaaS platforms:

- **1Password SCIM**
- **15Five**
- **Adobe**
- **Aircall**
- **Anthropic**
- **Apollo**
- **Asana**
- **AWS IAM**
- **Azure DevOps**
- **BambooHR**
- **Bill**
- **Bitbucket**
- **Box**
- **Brevo**
- **Calendly**
- **ClickUp**
- **Confluence**
- **Datadog**
- **dbt Labs**
- **Dialpad**
- **DocuSign**
- **Doppler**
- **Dropbox**
- **Figma SCIM**
- **Fivetran**
- **Freshdesk**
- **Front**
- **GitHub**
- **GitLab**
- **Gmail**
- **Gong**
- **Google Workspace**
- **Gusto**
- **Harvest**
- **HubSpot**
- **Instantly**
- **Intercom**
- **Jira**
- **Linear**
- **Loom SCIM**
- **Make**
- **Metabase**
- **Microsoft 365**
- **Miro**
- **Mural**
- **Notion**
- **Okta**
- **OneDrive**
- **OpenAI**
- **Outreach**
- **PagerDuty**
- **PandaDoc**
- **Pipedrive**
- **Ramp**
- **Salesforce**
- **Segment**
- **SendGrid**
- **Sentry**
- **SharePoint**
- **Slack**
- **Statsig**
- **Teams**
- **Teamtailor**
- **Typeform**
- **YouSign**
- **Zendesk**
- **Zoom**

## Project Structure

```
apps/                   # Integration implementations
├── bitbucket/         # Bitbucket integration
├── typeform/          # Typeform integration
└── ...               # Other integrations
packages/              # Shared packages and utilities
template/              # Integration template
docs/                  # Documentation
```

## Documentation

- [Contributing Guide](./CONTRIBUTING.md): Guidelines for contributing to the project
- [Architecture](./docs/architecture.md): Detailed architecture documentation
- [Template README](./template/README.md): Integration template documentation

## Development Flow

1. Generate a new integration using `pnpm generate`
2. Implement the required endpoints and event handlers
3. Add tests for your implementation
4. Submit a pull request following our contribution guidelines

## License

[Elastic License 2.0 (ELv2)](./LICENSE)
