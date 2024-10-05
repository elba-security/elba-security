# `getApps` Function Documentation

## Overview

The `getApps` function is an asynchronous operation designed to fetch application details from Microsoft's API within a specific tenant. It's crucial for managing third-party applications integrated with Microsoft services.

## Function Signature

```javascript
async function getApps({ tenantId, token, skipToken }: GetAppsParams)
```

## Parameters

- `tenantId` (String): This is the unique identifier for the Microsoft tenant from which the applications are retrieved.
- `token` (String): This is the authentication token required for accessing the Microsoft API.
- `skipToken` (String | Null): Used for pagination purposes, this parameter allows the function to skip to a specific part in the list of applications, facilitating batch processing.

## Return Type

The function returns an object with the following structure:

- `validApps` (Array of `MicrosoftApp`): These are the applications that successfully meet the defined schema criteria.
- `invalidApps` (Array): These applications fail to meet the schema criteria and are categorized separately.
- `nextSkipToken` (String): This token is used for continuing the retrieval process in subsequent pagination requests.

## Functionality

1. **URL Construction**: The function begins by constructing the API endpoint URL with necessary query parameters.
2. **API Request**: It then performs an API request to Microsoft's service, using the provided authentication token.
3. **Response Validation**: The function checks the success status of the API response, throwing `MicrosoftError` in case of failure.
4. **Data Parsing**: Next, it parses the API response into a structured format.
5. **Application Validation**: Each application data is validated against a predefined schema.
6. **Pagination**: Finally, the function handles pagination by extracting the `nextSkipToken` from the response for future requests.

## Fields in `MicrosoftApp`

Each object in the `validApps` array includes the following fields:

1. **`id`**: Unique identifier of the application.
2. **`description`**: Textual description of the application.
3. **`homepage`**: URL of the application's homepage.
4. **`oauth2PermissionScopes`**: List of OAuth 2.0 permission scopes associated with the application.
5. **`appDisplayName`**: The display name of the application.
6. **`appRoleAssignedTo`**: List of application permissions and roles.
7. **`info`**: Additional information about the application, such as the logo URL.
8. **`verifiedPublisher`**: Information about the verified publisher of the application.

## Usage

The `getApps` function is primarily used for managing and retrieving information about third-party applications in a Microsoft tenant environment. It is essential for administrators and developers who need to oversee application integrations within their organization's Microsoft infrastructure.

## Error Handling

The function is designed to handle errors effectively:

- Throws a `MicrosoftError` when the API request fails, allowing the calling code to catch and handle these exceptions appropriately.
- Provides detailed information about the error context, especially useful for debugging and logging purposes.
