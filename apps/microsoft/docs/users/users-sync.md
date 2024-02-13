# Users sync overview

The `getUsers` function retrieves a resource from Microsoft's API containing user data. This documentation outlines the structure of the retrieved resource and explains the significance of each field.

## Resource Structure

The resource returned by the `getUsers` function is an object with the following fields:

`validUsers`

- **Type**: Array of `MicrosoftUser`
- **Description**: This array contains user objects that have successfully passed the schema validation. Each MicrosoftUser object represents an individual user and contains detailed information about them.

`invalidUsers`

- **Type**: Array
- **Description**: This array holds user objects that failed the schema validation. These objects might be missing required fields or have data in an incorrect format.

`nextSkipToken`

- **Type**: String
- **Description**: This string is a token used for pagination. It represents the starting point for the next set of user data to be fetched in subsequent requests.

## Fields in `MicrosoftUser`

Each `MicrosoftUser` object within the `validUsers` array contains several fields, including:

`id`

- **Type**: String
- **Description**: The unique identifier for the user.

`mail`

- **Type**: String
- **Description**: The user's email address.

`userPrincipalName`

- **Type**: String
- **Description**: The principal name of the user, often used for login and identification purposes.

`displayName`

- **Type**: String
- **Description**: The full name or display name of the user.

## Usage

This resource is essential for applications that require detailed user information from a Microsoft tenant. The fields provide key identifiers and contact information that can be used for various purposes, including user management, communication, and security checks.

## Error Handling

Errors during the retrieval or parsing of this resource should be handled using the `MicrosoftError` exception to ensure robust error management in the application.
