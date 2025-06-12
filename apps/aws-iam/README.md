# AWS IAM Integration

This integration connects AWS IAM with Elba Security to provide user management and security monitoring capabilities.

## Features

- **User Synchronization**: Automatically sync AWS IAM users to Elba
- **User Management**: Delete AWS IAM users directly from Elba
- **Tag-based Metadata**: Extracts user information from AWS IAM tags (firstName, lastName, email)
- **AWS Signature V4 Authentication**: Secure authentication using AWS access keys

## Prerequisites

- AWS IAM user with the following permissions:
  - `iam:ListUsers`
  - `iam:ListUserTags`
  - `iam:DeleteUser` (if user deletion is required)
- Access Key ID and Secret Access Key for the IAM user
- AWS region where your IAM resources are located

## Development Setup

1. Copy `.env.local.example` to `.env.local` and fill in the required environment variables:

   ```bash
   # Elba
   ELBA_SOURCE_ID="your-elba-source-id"

   # Nango
   NANGO_SECRET_KEY="your-nango-secret-key"
   NANGO_INTEGRATION_ID="aws-iam"

   # Source Configuration
   AWS_IAM_USERS_SYNC_CRON="0 0 * * *"
   AWS_IAM_USERS_SYNC_BATCH_SIZE=100
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

## Authentication

This integration uses AWS Signature V4 authentication through Nango:

- **Authentication Type**: Basic Auth
- **Username**: AWS Access Key ID
- **Password**: AWS Secret Access Key
- **Connection Config**: AWS Region (e.g., "us-east-1")

## User Information

AWS IAM doesn't natively store user email addresses or names. This integration expects this information to be stored as tags on IAM users:

- `firstName`: User's first name
- `lastName`: User's last name
- `email`: User's email address

If these tags are not present, the integration will use the IAM username as a fallback.

## Testing

Run the test suite:

```bash
pnpm test
```

## Project Structure

```
src/
├── app/
│   └── api/
│       └── inngest/
│           └── route.ts       # Inngest webhook handler
├── common/
│   └── env.ts                 # Environment variable validation
├── connectors/
│   └── aws-iam/
│       ├── auth.ts            # AWS Signature V4 authentication
│       ├── types.ts           # TypeScript type definitions
│       ├── users.ts           # User operations (list, delete)
│       └── users.test.ts      # User operations tests
└── inngest/
    └── client.ts              # Inngest client and event functions
```

## Event Handlers

The integration implements the following Inngest functions:

- **User Sync Scheduler**: Runs on a cron schedule to trigger user synchronization
- **User Sync**: Fetches all IAM users and syncs them to Elba
- **User Delete**: Deletes a specific IAM user
- **Installation Validate**: Validates AWS credentials during installation

## Error Handling

The integration handles various AWS IAM API errors:

- **403 Forbidden**: Invalid AWS credentials or insufficient permissions
- **404 Not Found**: User doesn't exist (handled gracefully during deletion)
- **Rate Limiting**: Automatic retry with exponential backoff

## Security Considerations

- AWS credentials are securely stored in Nango
- All API requests use AWS Signature V4 for authentication
- Sensitive operations (like user deletion) require appropriate IAM permissions

## Limitations

- User email and name information must be stored as IAM tags
- AWS IAM doesn't have a concept of "admin" users that can't be deleted
- The integration uses a composite ID format (UserId:UserName) to support user deletion
