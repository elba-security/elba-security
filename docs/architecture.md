# Architecture

This document outlines the architecture for integrations. It emphasizes the separation of concerns through an organized file structure.

**Note:** Integrations are not expected to include React components. Routes should be utilized for redirecting the user to the relevant SaaS and to Elba.

## `/app`

The `/app` folder contains the Next.js application structure, including the API endpoints and other routing-related files. This folder is essential when using the Next.js App Router.

### `/api`

This directory houses the API endpoints. Each folder contains a file named `route.ts` that represents an accessible route, and usually a `service.ts` that's associated with the route file.

### `route.ts`

The route file (`route.ts`) is responsible for handling the requests data extraction and crafting responses. The business logic for the endpoint should reside in the corresponding `service.ts` file within the same directory.

### `service.ts`

The service file (`service.ts`) focuses exclusively on business logic. It should neither create a `Response` object nor read properties from the `Request`. If external API data access is required, the service should import a function from a connector. Using the database client to query or mutate data within a service is acceptable.

## `/connectors`

The `connectors` contain various files, each exporting functions that interact with the integrated SaaS. Each connector should address a single concern, such as authentication or user management.

## `/database`

The database schema and client are located in this folder. The client should generally remain unchanged to prevent disruptions in the pipeline testing. If the schema becomes too extensive, consider splitting it into multiple files in a `/schema` directory.

## `/inngest`

Code specific to [Inngest](https://www.inngest.com/) should be organized in this folder.

### `client.ts`

`client.ts` initializes the Inngest client and defines events with their input data. When a new Inngest function responding to an event is introduced, its corresponding event declaration should be added here.

### `/functions`

Inngest functions are stored here. The coding principles applied in `service.ts` files should also be followed in these functions.

An Inngest function can be broken down into smaller steps. Usually the steps should be used when we would need to retry that part of the business logic independently when it fails (for example when consuming external services), or when needing to defer code execution.

### `/middlewares`

Inngest middlewares allow errors thrown in Inngest functions to be handled in a single place. Each middleware should address a specific type of error, such as unauthorized exceptions leading to organization removal, or rate limit issues.
_Currently, we are expecting usage of middlewares to be limited only to error handling._
