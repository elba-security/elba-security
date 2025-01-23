# AI Assistant Guidelines

This document tracks important learnings and common pitfalls encountered while using the AI assistant for development.

## Common Pitfalls

### 1. Template Usage

- ❌ **Mistake**: Overriding template files without fully understanding their structure
- ✅ **Correct**: Always read and understand template files completely before making changes
- 📝 **Example**: The Cal.com integration initially overwrote `client.ts` without preserving the template's structure

### 2. Code Organization

- ❌ **Mistake**: Implementing business logic in connectors instead of Inngest functions
- ✅ **Correct**:
  - Connectors should only export pure functions for API interactions
  - Business logic should be in `inngest/functions/*`
  - Follow the architecture outlined in `docs/architecture.md`
- 📝 **Example**: Cal.com user sync logic was incorrectly placed in the connector instead of using the template's sync-users.ts structure

### 3. Dependency Management

- ❌ **Mistake**: Including external dependencies (like Nango) directly in connectors
- ✅ **Correct**:
  - Connectors should be pure functions that receive all dependencies as parameters
  - Dependencies like Nango should be initialized in Inngest functions or services
  - Keep connectors focused on data transformation and API interaction logic
- 📝 **Example**: Cal.com users connector initially imported and used Nango client directly

### 4. Environment Variables

- ❌ **Mistake**: Over-parameterizing functions with values that are available in environment
- ✅ **Correct**:
  - Use environment variables directly in connectors when they're part of the app's configuration
  - Environment variables are already validated and typed through `env.ts`
  - Don't pass environment values as parameters unless they need to be overridable
- 📝 **Example**: Cal.com connector initially took `baseUrl` as a parameter instead of using `env.CALCOM_API_BASE_URL`

### 5. Next.js Features

- ❌ **Mistake**: Reinventing or explicitly importing built-in features
- ✅ **Correct**:
  - Use global features provided by Next.js (like `fetch`)
  - Don't create types for or explicitly import built-in globals
  - Remember we're in a Next.js environment with modern features available
- 📝 **Example**: Cal.com connector initially created a custom `Fetch` type and passed `fetch` as a parameter

### 6. API Integration

- ❌ **Mistake**: Making assumptions about API endpoints without verification
- ✅ **Correct**:
  - Always verify API endpoints in the official documentation
  - Focus on the core requirements (e.g., listing users)
  - Don't invent endpoints that don't exist
  - Keep validation focused on the required functionality
- 📝 **Example**: Cal.com integration initially assumed a `/me` endpoint existed without verification

### 7. Code Cleanliness

- ❌ **Mistake**: Leaving unused imports and template comments in production code
- ✅ **Correct**:
  - Remove all unused imports
  - Template comments are for guidance only - remove after implementation
  - Keep production code clean and focused
- 📝 **Example**: Cal.com service had unused `ServiceNotAdminError` import

### 8. Integration Focus

- ❌ **Mistake**: Implementing unnecessary features or validations
- ✅ **Correct**:
  - Focus on core requirements (e.g., user synchronization)
  - Validate only what's necessary for the integration to function
  - Keep the integration simple and focused on its main purpose
- 📝 **Example**: Cal.com validation was overcomplicating auth checks instead of focusing on user list access

### 9. Installation Validation Pattern

- ❌ **Mistake**: Not following the established validation pattern from template
- ✅ **Correct**:
  1. Verify required access (e.g., list users)
  2. Update connection status
  3. Send both app.installed and resource sync events
  4. Return standard message responses
  5. Handle errors consistently with connection status updates
- 📝 **Example**: Cal.com validation initially missed sending app.installed event and proper error handling

## Template Structure

The template provides a clear separation of concerns:

```
src/
├── connectors/           # Pure API interactions only (no external deps)
│   ├── source/          # Pure functions for external API calls
│   └── elba/           # Pre-configured Elba client (don't modify)
├── inngest/functions/   # Business logic and orchestration
│   └── users/          # User sync implementation
└── app/                # Next.js routes and webhooks
```

## Best Practices

1. **Read First, Code Later**

   - Review all relevant template files before starting implementation
   - Pay special attention to comments and existing patterns
   - Check both code and documentation files

2. **Follow the Architecture**

   - `/connectors/*`: Pure API interaction functions without external dependencies
   - `/inngest/functions/*`: Business logic and orchestration
   - `/app/api/*`: API routes and webhooks
   - `/common/*`: Shared utilities and configurations

3. **Keep It Simple**

   - Use environment variables directly when they represent app configuration
   - Leverage built-in Next.js features and globals
   - Don't over-parameterize functions
   - Only make things configurable when there's a clear need

4. **Clean Code**

   - Remove template comments after implementation
   - Remove unused imports and code
   - Keep production code clean and focused
   - Use template code as guidance, not final implementation

5. **Documentation Updates**
   - Keep documentation in sync with code changes
   - Document any deviations from templates
   - Update this file with new learnings

## Action Items

1. Remove unused imports and template comments
2. Fix validation to focus on user list access
3. Document any future AI assistant mistakes here

# AI Learnings and Best Practices

## API Integration

- Always verify API endpoints against official documentation
- Don't make assumptions about endpoint existence
- Focus on core requirements (e.g., user list access for Cal.com)

## Code Cleanliness

- Remove unused imports and comments
- Keep code focused on essential functionality
- Follow existing patterns in the codebase

## Integration Patterns

- Always follow the template patterns from existing integrations
- For installation validation:
  1. Verify required access (e.g., list users)
  2. Update connection status
  3. Send both app.installed and resource sync events
  4. Return standard message responses
  5. Handle errors consistently with connection status updates
- Don't reinvent patterns that are already established

## Action Items

- [x] Remove unused imports (ServiceNotAdminError)
- [x] Fix validation to focus on user list access
- [x] Follow template pattern for installation validation
  - [x] Send app.installed event
  - [x] Send users.sync.requested event
  - [x] Use standard message responses
  - [x] Proper error handling with connection status
