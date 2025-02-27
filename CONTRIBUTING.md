# Contributing to _elba-security_

The following is a set of guidelines for contributing to **elba-security** and its packages.

## What should I know before I get started?

### Project Architecture

This project is a monorepo that uses [Turborepo](https://turbo.build/repo).
Each SaaS integration has its own `Next.js` app located in `/apps/{SaaS}`. The folder `/packages` contains shared tools and configuration.

### Required tools

#### `nango`

We use [`nango`](https://nango.dev/) for its efficient handling of OAuth connections and tokens for third-party services.

#### `inngest`

We use [`inngest`](https://inngest.com/) for its efficient handling of event-driven architectures and serverless functions, enabling us to easily create and manage responsive workflows.

#### `vitest`

We also require [`vitest`](https://vitest.dev/) as the test runner for several reasons. It is well-maintained, and its configuration is less tricky than that for `jest`. Additionally, it is faster.

If you are familiar with `jest`, you will quickly adapt to `vitest`, as both APIs are very similar.

### Important Resources

- **Docs**: [learn more about our Open API and how to start a new SaaS integration.](https://elba-security.readme.io/reference/getting-started-with-your-api)
- **Slack**: [ask for support.](https://elbahqworkspace.slack.com)

## How to start?

### Prerequisites

Before you begin, ensure that you have the following installed on your machine:

- **Node.js**: **elba-security** currently requires Node.js version 22. You can download it from [the official Node.js website](https://nodejs.org/).
- **pnpm**: We use `pnpm` for managing package dependencies. It needs to be installed globally on your machine.

### Starting a New SaaS Integration

Once you have the prerequisites installed, you're ready to create a new SaaS integration. Here's how you can do it:

1. Navigate to the root directory of the repository:

```bash
cd elba-security
```

2. Run the integration generator:

```bash
pnpm generate
```

3. When prompted, enter your integration name in kebab-case format (e.g., `awesome-service`).

The generator will:

- Create a new Next.js app in the `apps/` directory
- Set up the correct package name (`@elba-security/your-integration`)
- Copy all the necessary template files and configurations

> Don't forget to read the `README.md` file generated at the root of your integration folder.

### Making Reviews Easier

To make the review process more efficient, follow these steps to separate template-generated code from your integration-specific changes:

1. **Commit the template-generated code immediately after generation:**

```bash
git add apps/your-integration
git commit -m "chore: initial template generation for your-integration"
```

2. **Now make your integration-specific changes** in separate, focused commits.

3. **In your PR description, include the commit hash of your template generation commit:**
   - Example: "Template baseline: 1a2b3c4"
   - This allows reviewers to easily find your baseline

This approach enables reviewers to see just the difference between the template and your custom implementation, rather than having to review all the generated template code.

#### For Reviewers

When reviewing an integration PR, you can focus only on the changes made to the template:

1. Find the template baseline commit hash from the PR description
2. Use GitHub's comparison view:
   - Go to the "Files changed" tab in the PR
   - Near the top, click the dropdown that says "Compare"
   - Select "specific commit range"
   - For the base, enter the template generation commit hash
   - For the comparison, use the latest commit

You can also construct a URL directly: `https://github.com/elba-security/repository-name/compare/[template-commit-sha]...[latest-commit-sha]`

## How to open a pull request

Opening a Pull Request (PR) on a public repository on GitHub involves a series of steps. Here's a general guide on how to do it:

1. **Fork the Repository:**

- Go to the elba GitHub repository page.
- Click the `"Fork"` button at the top right corner. This creates a copy of the repository in your GitHub account.

2. **Clone the Forked Repository:**

- Clone the forked repository to your local machine. You can find the URL for cloning on the repository page.
- Use the command `git clone [URL of the forked repo]`.

3. **Create a New Branch:**

- Navigate to the cloned repository directory on your local machine.
- Create a new branch using `git checkout -b [new-branch-name]`.

4. **Make Your Changes:**

- Work on the changes you wish to make in this new branch. This could be adding new files, editing existing ones, etc.

5. **Commit the Changes:**

- After making changes, add them to the staging area using `git add .` (to add all changes) or `git add [file-name]`(for specific files).
- Then commit the changes with a meaningful commit message using `git commit -m "Your commit message"`.

6. **Push the Changes to Your Fork:**

- Push your new branch and changes to your fork on GitHub using `git push origin [new-branch-name]`.

7. **Create the Pull Request:**

- Go to your forked repository on GitHub.
- You'll likely see a `"Compare & pull request"` button for your recently pushed branch. Click it.
- Alternatively, you can switch to your new branch and click the `"New pull request"` button.
- Fill in the PR form by following the provided PR template. It's important to be clear and descriptive we are able to understand what you've done and why.

8. **Submit the Pull Request:**

- Once you've filled out the PR form, click the `"Create pull request"` button to submit it.
- Your PR will now be visible and we will review your changes, request modifications, or merge them.

9. **Follow Up:**

- Keep an eye on your PR for any comments or requests for changes that we've made. Responding promptly and making any requested changes is key to getting your PR merged.

## How to implement tests?

_The template provides an example implementation of installation validation and resource syncing processes. It is fully tested and offers a clear perspective on how we intend the tests to be implemented._

### Elba API Mocks

The package elba-msw should be used to mock the Elba Open API during unit tests. It validates request payloads against schemas. In your tests, there is no need to expect calls against the Elba Open API.

_Note that elba-msw is already configured in the template._

### Mocking SaaS APIs

If the integration performs HTTP requests directly, without using an SDK, you should implement your own msw handlers.

### Mocking SaaS SDK

Mocking each endpoint correctly using msw can be challenging if the integration uses an SDK. In such cases, we suggest mocking the SDK package using vi.mock.

### Running the Tests

Tests can be started using:

```bash
pnpm test
```

For development, you can use watch mode:

```bash
pnpm test:watch
```

### Writing the tests

The tests should cover the `service.ts` files and account for various behaviors: success, failure, and abortion.

Each test for a function should be enclosed within a describe block. The description for each test case should adhere to the following pattern:

> **should** _do foo and bar_ **when** biz is false

**example**:

```ts
describe('myFunction', () => {
  test('should return "foo" when biz is false', () => {
    // ...
  });
  test('should return "bar" when biz is true', () => {
    // ...
  });
});
```

The tests should verify:

1. The correct handling of webhook events
2. Proper error handling and mapping
3. Correct event emission through Inngest
4. Proper interaction with the Elba API
