# Loom SCIM Integration

This integration enables user provisioning and management for Loom using SCIM (System for Cross-domain Identity Management).

## Features

- User synchronization via SCIM API
- Role management (admin, creator, viewer)
- Automatic user deactivation
- Pagination support for large user bases

## Prerequisites

- Loom Enterprise account
- SAML SSO must be enabled
- Domain must be verified in Loom
- SCIM Bridge URL and API Key from Loom

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Elba Configuration
ELBA_SOURCE_ID="your-elba-source-id"

# Nango Configuration
NANGO_INTEGRATION_ID="loom-scim"
NANGO_SECRET_KEY="your-nango-secret"

# Loom SCIM Configuration
LOOM_SCIM_USERS_SYNC_CRON="0 0 * * *"  # Daily sync at midnight
LOOM_SCIM_USERS_SYNC_BATCH_SIZE=100    # Number of users per page
```

### Nango Connection Configuration

The Nango connection requires:

- **scimBridgeUrl**: The SCIM Bridge URL from your Loom configuration
- **apiKey**: The Bearer token for authentication

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## SCIM Implementation Details

This integration follows the SCIM 2.0 standard (RFC 7643) and includes:

- Standard SCIM user schema with Loom-specific extensions
- Support for the `loomMemberRole` custom attribute
- Pagination using `startIndex` and `count` parameters
- Error handling for SCIM-specific error responses

### User Roles

Loom supports the following roles via the `loomMemberRole` attribute:

- `admin`: Full administrative access
- `creator`: Can create and manage content
- `viewer`: View-only access
- `default`: Inherits the default role configuration

## Testing

Tests use MSW (Mock Service Worker) to simulate SCIM API responses. Run tests with:

```bash
pnpm test
```
