# Figma SCIM Integration

This integration enables Elba Security to manage Figma organization users through the SCIM 2.0 API.

## Features

- **User Synchronization**: Syncs all active users from your Figma organization
- **User Deletion**: Deactivates users in Figma when requested by Elba
- **SCIM 2.0 Compliant**: Uses standard SCIM protocol for user management
- **Enterprise Ready**: Supports Figma Organization and Enterprise plans

## Prerequisites

- Figma Organization or Enterprise plan
- Organization admin access
- SCIM API token from Figma

## Configuration

### Environment Variables

```bash
# Elba Configuration
ELBA_SOURCE_ID=                    # Your Elba source ID
ELBA_API_BASE_URL=                 # Elba API base URL

# Nango Configuration
NANGO_INTEGRATION_ID=figma-scim   # Nango integration ID
NANGO_SECRET_KEY=                  # Your Nango secret key

# Figma Configuration
FIGMA_SCIM_API_BASE_URL=https://www.figma.com  # Figma API base URL
FIGMA_SCIM_USERS_SYNC_CRON="0 0 * * *"         # Daily sync at midnight
FIGMA_SCIM_USERS_SYNC_BATCH_SIZE=100           # Users per page
```

### Nango Connection Configuration

When setting up the connection in Nango, you'll need:

1. **API Key**: Generate from Figma Admin Settings → Settings → Login and provisioning → SCIM provisioning
2. **Tenant ID**: Your Figma organization ID (found in the SCIM settings URL)

The connection config should include:

```json
{
  "tenantId": "your-organization-id"
}
```

## Development

### Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required values
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

### Testing

Run the test suite:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

Run type checking:

```bash
pnpm type-check
```

## API Implementation

### User Sync

The integration fetches users from Figma's SCIM API and transforms them to Elba's user format:

- Only syncs active users
- Uses SCIM pagination (startIndex/itemsPerPage)
- Maps SCIM user attributes to Elba user properties

### User Deletion

When Elba requests user deletion:

- Uses SCIM PATCH operation to set `active: false`
- Gracefully handles already-deleted users (404 responses)

## SCIM API Details

### Endpoints Used

- `GET /scim/v2/{tenantId}/Users` - List users with pagination
- `PATCH /scim/v2/{tenantId}/Users/{userId}` - Deactivate users

### Authentication

All requests use Bearer token authentication with the SCIM API token.

### Error Handling

- 401 Unauthorized → Triggers connection error in Elba
- 404 Not Found (on delete) → Silently succeeds (user already deleted)
- Other errors → Logged with SCIM error details

## Limitations

- SCIM is only available on Organization and Enterprise plans
- Can only manage organization members (not guests)
- Requires organization admin privileges
- Read-only sync (no user provisioning from Elba)

## Resources

- [Figma SCIM Documentation](https://help.figma.com/hc/en-us/articles/360040449773-Provision-Figma-with-SCIM)
- [SCIM 2.0 Protocol](https://datatracker.ietf.org/doc/html/rfc7644)
- [Nango Figma SCIM Integration](https://docs.nango.dev/integrations/all/figma-scim)
