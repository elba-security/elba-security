# Okta Third-Party Apps Implementation Plan

## Executive Summary

This document outlines the plan to implement third-party apps support for the Okta integration in Elba Security. Based on research of existing implementations (Google, GitHub, Dropbox) and Okta's API capabilities, we propose adding OAuth grant management functionality to monitor and control third-party applications authorized by users in Okta organizations.

## Background Research

### Existing Implementations Analysis

#### 1. **Google Integration**

- Uses Google Admin SDK Directory API (`admin.tokens.list()`)
- Syncs OAuth tokens by fetching users in batches, then their tokens
- Groups tokens by client ID to create unified app objects
- Supports scope normalization and admin permission validation

#### 2. **GitHub Integration**

- Uses GitHub Apps API (`/orgs/{org}/installations`)
- Syncs GitHub Apps (not OAuth Apps) installed in organizations
- Associates apps with admin users only
- Formats permissions as `resource:access` strings

#### 3. **Dropbox Integration**

- Uses Dropbox Team API (`/team/linked_apps/list_members_linked_apps`)
- Supports both bulk sync and individual user refresh
- No OAuth scope information available from API
- Handles app revocation through API

### Okta API Capabilities

Based on API research, Okta provides:

1. **User Grants API**
   - `GET /api/v1/users/{userId}/grants` - List all grants for a user
   - `GET /api/v1/users/{userId}/clients/{clientId}/grants` - List grants for user/client combo
   - `DELETE /api/v1/users/{userId}/grants/{grantId}` - Revoke a specific grant
2. **Grant Response Schema**
   ```json
   {
     "id": "oag3ih3zk6FNpRKVO0g7",
     "status": "ACTIVE",
     "created": "2023-11-15T10:23:45.000Z",
     "clientId": "0oa1gjh63g214q0Hq0g4",
     "userId": "00u1gjdkso214q0Hq0g3",
     "scopeId": "okta.users.read",
     "source": "ADMIN",
     "_links": {
       "client": {
         "href": "https://example.okta.com/api/v1/apps/0oa1gjh63g214q0Hq0g4",
         "title": "My OAuth App"
       }
     }
   }
   ```

## Implementation Plan

### Phase 1: Architecture Decision

**Recommendation**: Keep the existing legacy pattern and add third-party apps support using the same approach.

**Rationale**:

- No migration needed - focus on adding new functionality
- ElbaInngestClient doesn't support third-party apps anyway
- Consistent with how Google/Dropbox handle third-party apps
- Simpler implementation without architectural changes

### Phase 2: Core Implementation

#### 1. **Data Models & Types**

Create schemas for Okta grants and API responses:

```typescript
// src/connectors/okta/grants.ts
const oktaGrantSchema = z.object({
  id: z.string(),
  status: z.enum(['ACTIVE', 'REVOKED']),
  created: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scopeId: z.string(),
  source: z.enum(['ADMIN', 'USER']),
  _links: z.object({
    client: z
      .object({
        href: z.string(),
        title: z.string().optional(),
      })
      .optional(),
  }),
});

const oktaApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  created: z.string(),
  _links: z.object({
    href: z.string(),
  }),
});
```

#### 2. **API Connector Functions**

Implement functions to interact with Okta's API:

```typescript
// src/connectors/okta/grants.ts

export async function* getGrantsForAllUsers(client: OktaClient, options: { batchSize: number }) {
  for await (const users of getUsersPages(client)) {
    const grants = await Promise.all(users.map((user) => getGrantsForUser(client, user.id)));
    yield grants.flat();
  }
}

export async function getGrantsForUser(client: OktaClient, userId: string): Promise<OktaGrant[]> {
  const response = await client.get(`/api/v1/users/${userId}/grants`);
  return oktaGrantsArraySchema.parse(response.data);
}

export async function getApplication(client: OktaClient, appId: string): Promise<OktaApplication> {
  const response = await client.get(`/api/v1/apps/${appId}`);
  return oktaApplicationSchema.parse(response.data);
}

export async function revokeGrant(
  client: OktaClient,
  userId: string,
  grantId: string
): Promise<void> {
  await client.delete(`/api/v1/users/${userId}/grants/${grantId}`);
}
```

#### 3. **Data Transformation**

Transform Okta grants to Elba's third-party apps format:

```typescript
// src/connectors/okta/third-party-apps.ts

export async function formatThirdPartyApps(
  grants: OktaGrant[],
  client: OktaClient
): Promise<ThirdPartyAppsObject[]> {
  // Group grants by clientId
  const grantsByApp = new Map<string, OktaGrant[]>();

  for (const grant of grants) {
    const existing = grantsByApp.get(grant.clientId) || [];
    grantsByApp.set(grant.clientId, [...existing, grant]);
  }

  // Fetch app details and format for Elba
  const apps = await Promise.all(
    Array.from(grantsByApp.entries()).map(async ([clientId, appGrants]) => {
      try {
        const app = await getApplication(client, clientId);

        return {
          id: app.id,
          name: app.label || app.name,
          url: app._links.href,
          users: appGrants.map((grant) => ({
            id: grant.userId,
            createdAt: grant.created,
            scopes: [grant.scopeId],
          })),
        };
      } catch (error) {
        // Log error but continue with other apps
        console.error(`Failed to fetch app ${clientId}:`, error);
        return null;
      }
    })
  );

  return apps.filter(Boolean);
}
```

#### 4. **Webhook Routes (Legacy Pattern)**

Since elba-api doesn't support event-based third-party apps, use webhook routes:

```typescript
// src/app/api/webhooks/elba/third-party-apps/start-sync/route.ts
export async function POST(request: Request) {
  const { organisationId } = await validateWebhookRequest(request);

  await inngest.send({
    name: 'okta/third.party.apps.sync.requested',
    data: {
      organisationId,
      syncStartedAt: new Date().toISOString(),
      isFirstSync: false,
    },
  });

  return new Response();
}

// src/app/api/webhooks/elba/third-party-apps/refresh-object/route.ts
export async function POST(request: Request) {
  const { organisationId, userId, appId } = await validateWebhookRequest(request);

  await inngest.send({
    name: 'okta/third.party.apps.refresh.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });

  return new Response();
}

// src/app/api/webhooks/elba/third-party-apps/delete-object/route.ts
export async function POST(request: Request) {
  const { organisationId, userId, appId } = await validateWebhookRequest(request);

  await inngest.send({
    name: 'okta/third.party.apps.delete.requested',
    data: {
      organisationId,
      userId,
      appId,
    },
  });

  return new Response();
}
```

#### 5. **Inngest Functions**

Define custom Inngest functions for third-party apps:

```typescript
// src/inngest/functions/third-party-apps/sync-apps.ts
export const syncThirdPartyApps = inngest.createFunction(
  {
    id: 'okta-sync-third-party-apps',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'okta/third.party.apps.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const elba = createElbaClient(organisationId);
    const client = await createOktaClient(organisationId);

    await step.run('sync-apps', async () => {
      let cursor: string | null = null;
      const pageSize = env.THIRD_PARTY_APPS_BATCH_SIZE;

      do {
        const grants = await getGrantsPage(client, { cursor, pageSize });
        const apps = await formatThirdPartyApps(grants.items, client);

        await elba.thirdPartyApps.updateObjects({ apps });

        cursor = grants.nextCursor;
      } while (cursor);

      // Delete apps that no longer exist
      await elba.thirdPartyApps.deleteObjects({
        syncedBefore: syncStartedAt,
      });
    });
  }
);

// src/inngest/functions/third-party-apps/refresh-app.ts
export const refreshThirdPartyApp = inngest.createFunction(
  {
    id: 'okta-refresh-third-party-app',
    retries: 3,
  },
  { event: 'okta/third.party.apps.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, userId, appId } = event.data;

    const elba = createElbaClient(organisationId);
    const client = await createOktaClient(organisationId);

    await step.run('refresh-app', async () => {
      const grants = await getGrantsForUser(client, userId);
      const userAppGrant = grants.find((g) => g.clientId === appId);

      if (!userAppGrant) {
        await elba.thirdPartyApps.deleteObjects({
          ids: [{ userId, appId }],
        });
        return;
      }

      const app = await getApplication(client, appId);
      const formattedApp = {
        id: app.id,
        name: app.label || app.name,
        url: app._links.href,
        users: [
          {
            id: userId,
            createdAt: userAppGrant.created,
            scopes: [userAppGrant.scopeId],
          },
        ],
      };

      await elba.thirdPartyApps.updateObjects({ apps: [formattedApp] });
    });
  }
);

// src/inngest/functions/third-party-apps/delete-app.ts
export const deleteThirdPartyApp = inngest.createFunction(
  {
    id: 'okta-delete-third-party-app',
    retries: 3,
  },
  { event: 'okta/third.party.apps.delete.requested' },
  async ({ event, step }) => {
    const { organisationId, userId, appId } = event.data;

    const client = await createOktaClient(organisationId);

    await step.run('revoke-grant', async () => {
      const grants = await getGrantsForUser(client, userId);
      const grant = grants.find((g) => g.clientId === appId);

      if (grant) {
        await revokeGrant(client, userId, grant.id);
      }
    });
  }
);

// src/inngest/functions/third-party-apps/schedule-syncs.ts
export const scheduleThirdPartyAppsSync = inngest.createFunction(
  {
    id: 'okta-schedule-third-party-apps-syncs',
    retries: 3,
  },
  { cron: env.THIRD_PARTY_APPS_SYNC_CRON },
  async ({ step }) => {
    const organisations = await getActiveOrganisations();

    await Promise.all(
      organisations.map((org) =>
        inngest.send({
          name: 'okta/third.party.apps.sync.requested',
          data: {
            organisationId: org.id,
            syncStartedAt: new Date().toISOString(),
            isFirstSync: false,
          },
        })
      )
    );
  }
);
```

### Phase 3: Testing Strategy

1. **Unit Tests**

   - Test grant fetching with mocked Okta API responses
   - Test data transformation logic
   - Test error handling scenarios

2. **Integration Tests**

   - Test full sync flow with multiple users and apps
   - Test pagination handling
   - Test grant revocation

3. **Edge Cases**
   - Handle users with no grants
   - Handle invalid/deleted apps
   - Handle API rate limiting
   - Handle partial failures during sync

### Phase 4: Configuration

Add required environment variables:

```env
# Third-party apps configuration
THIRD_PARTY_APPS_SYNC_CRON="0 0 * * *"  # Daily at midnight
THIRD_PARTY_APPS_BATCH_SIZE=100
THIRD_PARTY_APPS_CONCURRENCY=5
```

### Phase 5: Deployment Considerations

1. **Performance Optimization**

   - Implement concurrent grant fetching with rate limiting
   - Cache app details to avoid repeated API calls
   - Use batch operations where possible

2. **Error Recovery**

   - Implement exponential backoff for rate limits
   - Continue sync even if individual app fetches fail
   - Log detailed errors for debugging

3. **Monitoring**
   - Track sync duration and success rates
   - Monitor API usage against Okta limits
   - Alert on repeated failures

## Implementation Timeline

1. **Week 1**: Implement core grant fetching and transformation
2. **Week 2**: Add webhook routes and Inngest functions
3. **Week 3**: Testing and error handling
4. **Week 4**: Performance optimization and deployment

## Risks and Mitigations

1. **API Rate Limits**

   - Risk: Okta has strict rate limits
   - Mitigation: Implement intelligent rate limiting and backoff

2. **Large Organizations**

   - Risk: Organizations with many users/apps may timeout
   - Mitigation: Implement efficient pagination and concurrent processing

3. **Scope Complexity**
   - Risk: Okta scopes may be complex or nested
   - Mitigation: Start with simple scope mapping, iterate based on feedback

## Future Enhancements

1. **Advanced Scope Analysis**

   - Group related scopes
   - Identify high-risk permissions
   - Provide scope descriptions

2. **App Risk Scoring**

   - Analyze app age and usage patterns
   - Flag suspicious or unused apps
   - Integration with threat intelligence

3. **Automated Remediation**
   - Auto-revoke unused apps after X days
   - Enforce app allowlists
   - Scheduled access reviews

## Conclusion

This implementation plan provides a comprehensive approach to adding third-party apps support to the Okta integration. By following the patterns established in other integrations and leveraging Okta's robust API, we can deliver a valuable security feature that helps organizations monitor and control OAuth application access.
