<img width="1280" alt="GitHub" src="https://github.com/user-attachments/assets/d2695260-ae07-4fa2-9bbe-a98f85ad3cfe" />

# elba security

## Introduction

### Repository Overview

This repository is the hub for elba's integrations. Each integration within this repository plays an essential role as middleware. They serve as the connecting bridge between a variety of SaaS APIs and elba's open API.

### Core Purpose

Each integration's primary responsibility is to synchronize user data from SaaS platforms to Elba's system. This involves:

1. **User Data Collection**: Fetching users from the SaaS platform's API
2. **Data Transformation**: Converting the SaaS-specific user format to Elba's expected format
3. **Synchronization**: Keeping Elba's system updated through:
   - Initial sync during installation
   - Periodic sync requests

### Functionality and Data Handling

These integrations are designed to collect and manage data, including details about SaaS users, third-party applications, and different types of data such as files and messages.

### Integration Actions and Webhooks

elba uses webhooks to manage certain actions within these integrations. These actions include a variety of tasks such as altering user permissions and accessing files, ensuring smooth and effective interactions between elba interface and software services.

### License

[Elastic License 2.0 (ELv2)](./LICENSE)

## Getting Started

- **Installation**: Clone the repository and install dependencies using `pnpm install` command.

- **Creating your integration**: Instructions on how to start a new integration are located in [CONTRIBUTING.md](https://github.com/elba-security/elba-security/blob/staging/CONTRIBUTING.MD).

- **Documentation**:
  - [architecture.md](https://github.com/elba-security/elba-security/blob/staging/docs/architecture.md) outlines the architectural design principles and structures we follow.
