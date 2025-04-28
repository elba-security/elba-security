# AI Assistant Guidelines

This document tracks important learnings and best practices for developing integrations with the AI assistant.

## Core Principles

### 1. Template-First Development

- ❌ **Mistake**: Starting development without understanding template structure
- ✅ **Correct**:
  - Read and understand template files completely before making changes
  - Follow established patterns from existing integrations
  - Use template code as guidance, not just for copying
- 📝 **Example**: Cal.com integration initially overwrote `client.ts` without preserving the template's structure

### 2. Architecture & Code Organization

- ❌ **Mistake**: Mixing concerns and misplacing business logic
- ✅ **Correct**:

  ```text
  src/
  ├── connectors/     # Pure API interactions only
  │   ├── source/    # External API calls (no dependencies)
  │   └── elba/      # Pre-configured Elba client
  ├── inngest/       # Business logic and orchestration
  └── app/          # Next.js routes and webhooks
  ```

- 📝 **Example**: Business logic belongs in Inngest functions, not in connectors

### 3. Dependency & Configuration Management

- ❌ **Mistake**:
  - Including external dependencies in connectors
  - Over-parameterizing with environment values
- ✅ **Correct**:
  - Keep connectors pure with dependencies as parameters
  - Use environment variables directly for app configuration
  - Initialize shared clients in appropriate services
- 📝 **Example**: Use `env.CALCOM_API_BASE_URL` instead of passing as parameter

## Implementation Patterns

### 1. Testing

- **Mock Setup**

  ```typescript
  // Proper Nango mock pattern
  vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
    getConnection: vi.fn().mockResolvedValue({
      credentials: { access_token: 'access-token' },
    }),
  }));
  ```

- **Key Practices**:
  - Use `createInngestFunctionMock` for Inngest functions
  - Use `spyOnElba` for Elba client interactions
  - Set up MSW handlers for external APIs
  - Test both success and error scenarios
  - Verify all side effects (API calls, events, logs)

### 2. Authentication & OAuth

- **Key Principles**:

  - Never implement OAuth flows directly in integrations
  - Always use Nango for authentication handling
  - Validate credential structure from Nango

- **Standard Pattern**:

  ```typescript
  // Getting credentials from Nango
  const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
  if (!('access_token' in credentials)) {
    throw new Error('Invalid credentials structure');
  }
  ```

- **Common Mistakes**:
  - ❌ Implementing OAuth flows in the integration
  - ❌ Storing access tokens directly
  - ❌ Not validating credential structure
  - ✅ Using Nango for all OAuth operations
  - ✅ Proper credential validation
  - ✅ Clean error handling for auth failures

### 3. Error Handling

- **Types & Recovery**:

  - `NonRetriableError` for permanent failures
  - `IntegrationError` for API-related errors
  - Map external errors appropriately
  - Update connection status on critical errors

- **Logging**:

  ```typescript
  logger.error('Failed to validate installation', {
    organisationId,
    error,
    context: 'additional info',
  });
  ```

### 4. User Synchronization

- **Data Flow**:

  1. Validate API responses with Zod schemas
  2. Handle pagination properly
  3. Process valid/invalid users separately
  4. Clean up removed users
  5. Update connection status

- **Performance**:
  - Use batch operations
  - Handle rate limiting
  - Clean up old data efficiently

### 5. Installation Validation

- **Required Steps**:

  1. Verify API access
  2. Update connection status
  3. Send app.installed event
  4. Trigger initial sync
  5. Handle errors with status updates

- **Example**:

  ```typescript
  try {
    await verifyAccess();
    await updateConnectionStatus();
    await sendEvents();
    return { message: 'Installation validated' };
  } catch (error) {
    await handleError(error);
  }
  ```

## Common Pitfalls

1. **API Integration**

   - ❌ Making assumptions about endpoints
   - ✅ Verify against official documentation
   - ✅ Focus on core requirements

2. **Code Quality**

   - ❌ Leaving template comments/unused imports
   - ✅ Keep code focused and clean
   - ✅ Remove guidance comments after implementation

3. **Testing**

   - ❌ Inconsistent mocking patterns
   - ✅ Follow established test structures
   - ✅ Cover all edge cases

4. **Error Handling**
   - ❌ Inconsistent error management
   - ✅ Use appropriate error types
   - ✅ Proper logging and recovery

## Action Items

1. [ ] Standardize test patterns across integrations
2. [ ] Document new error handling patterns
3. [ ] Update template with latest best practices
4. [ ] Remove redundant code and comments
