# Configuration Recommendations API Integration Specification

## Overview

This document specifies the changes required to the elba-api project and data model to support configuration recommendations from external integrations. The feature allows integrations to send security configuration data that will be displayed in a new "Configuration" tab in the source settings.

## 1. Data Model Changes

### 1.1 New Schema: `configuration_module`

Create a new schema to store configuration check data:

```sql
-- Create new schema
CREATE SCHEMA configuration_module;

-- Store configuration check definitions
CREATE TABLE configuration_module.check_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  category configuration_module.check_category NOT NULL,
  severity configuration_module.severity_level NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Store localized text for check definitions
CREATE TABLE configuration_module.check_definition_i18n (
  check_definition_id uuid PRIMARY KEY REFERENCES configuration_module.check_definitions(id),
  name_source text NOT NULL,
  name_en text,
  name_fr text,
  name_de text,
  name_es text,
  name_it text,
  name_pt text,
  name_ja text,
  description_source text NOT NULL,
  description_en text,
  description_fr text,
  description_de text,
  description_es text,
  description_it text,
  description_pt text,
  description_ja text,
  remediation_steps_source jsonb NOT NULL, -- Array of steps
  remediation_steps_en jsonb,
  remediation_steps_fr jsonb,
  remediation_steps_de jsonb,
  remediation_steps_es jsonb,
  remediation_steps_it jsonb,
  remediation_steps_pt jsonb,
  remediation_steps_ja jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Store source-specific settings
CREATE TABLE configuration_module.source_settings (
  source_id uuid PRIMARY KEY REFERENCES saas.sources(id),
  refresh_configuration_webhook_url text,
  supports_auto_remediation boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Store the actual configuration check results
CREATE TABLE configuration_module.source_configuration_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES saas.sources(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  check_handle text NOT NULL,
  status configuration_module.check_status NOT NULL,
  details text,
  metadata jsonb, -- For source-specific data
  checked_at timestamp NOT NULL,
  last_synced_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  -- Version tracking for optimistic locking
  version integer NOT NULL DEFAULT 0,

  UNIQUE(source_id, organisation_id, check_handle)
);

-- Store configuration scores
CREATE TABLE configuration_module.source_configuration_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES saas.sources(id),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  overall_score numeric(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  category_scores jsonb NOT NULL, -- {authentication: 85, access_control: 90, ...}
  total_checks integer NOT NULL,
  passed_checks integer NOT NULL,
  failed_checks integer NOT NULL,
  warning_checks integer NOT NULL,
  calculated_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(source_id, organisation_id)
);

-- Create indexes
CREATE INDEX idx_source_configuration_checks_org_source
  ON configuration_module.source_configuration_checks(organisation_id, source_id);
CREATE INDEX idx_source_configuration_checks_status
  ON configuration_module.source_configuration_checks(status)
  WHERE status IN ('fail', 'warning');
CREATE INDEX idx_source_configuration_checks_synced
  ON configuration_module.source_configuration_checks(last_synced_at);

-- Create enums
CREATE TYPE configuration_module.check_category AS ENUM (
  'authentication',
  'access_control',
  'data_protection',
  'admin_security',
  'compliance',
  'network_security'
);

CREATE TYPE configuration_module.severity_level AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

CREATE TYPE configuration_module.check_status AS ENUM (
  'pass',
  'fail',
  'warning',
  'error',
  'not_applicable'
);
```

### 1.2 Updates to Existing Tables

Add configuration module support to existing tables:

```sql
-- Add to saas.app_source to indicate configuration support
ALTER TABLE saas.app_source
ADD COLUMN has_configuration_support boolean NOT NULL DEFAULT false;

-- Add to saas.app_source_organisation for configuration activation
ALTER TABLE saas.app_source_organisation
ADD COLUMN configuration_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN configuration_first_scan_status saas.scan_status NOT NULL DEFAULT 'not_started',
ADD COLUMN configuration_last_scan_at timestamp;
```

### 1.3 Add to datamodel.dbml

```dbml
/////
// SCHEMA configuration_module
/////

enum configuration_module.check_category {
  authentication
  access_control
  data_protection
  admin_security
  compliance
  network_security
}

enum configuration_module.severity_level {
  critical
  high
  medium
  low
}

enum configuration_module.check_status {
  pass
  fail
  warning
  error
  not_applicable
}

Table configuration_module.check_definitions {
  id uuid [primary key, unique, not null, default: `gen_random_uuid()`]
  handle text [not null, unique]
  category configuration_module.check_category [not null]
  severity configuration_module.severity_level [not null]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
}

Table configuration_module.check_definition_i18n {
  check_definition_id uuid [primary key, ref: - configuration_module.check_definitions.id]
  name_source text [not null]
  name_en text
  name_fr text
  name_de text
  name_es text
  name_it text
  name_pt text
  name_ja text
  description_source text [not null]
  description_en text
  description_fr text
  description_de text
  description_es text
  description_it text
  description_pt text
  description_ja text
  remediation_steps_source jsonb [not null]
  remediation_steps_en jsonb
  remediation_steps_fr jsonb
  remediation_steps_de jsonb
  remediation_steps_es jsonb
  remediation_steps_it jsonb
  remediation_steps_pt jsonb
  remediation_steps_ja jsonb
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
}

Table configuration_module.source_settings {
  source_id uuid [primary key, ref: - saas.sources.id]
  refresh_configuration_webhook_url text
  supports_auto_remediation boolean [not null, default: false]
  metadata jsonb
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
}

Table configuration_module.source_configuration_checks {
  id uuid [primary key, unique, not null, default: `gen_random_uuid()`]
  source_id uuid [not null, ref: > saas.sources.id]
  organisation_id uuid [not null, ref: > organisations.id]
  check_handle text [not null]
  status configuration_module.check_status [not null]
  details text
  metadata jsonb
  checked_at timestamp [not null]
  last_synced_at timestamp [not null, default: `now()`]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]
  version integer [not null, default: 0]

  indexes {
    (source_id, organisation_id, check_handle) [unique]
    (organisation_id, source_id)
    status [note: 'WHERE status IN ("fail", "warning")']
    last_synced_at
  }
}

Table configuration_module.source_configuration_scores {
  id uuid [primary key, unique, not null, default: `gen_random_uuid()`]
  source_id uuid [not null, ref: > saas.sources.id]
  organisation_id uuid [not null, ref: > organisations.id]
  overall_score numeric [not null]
  category_scores jsonb [not null]
  total_checks integer [not null]
  passed_checks integer [not null]
  failed_checks integer [not null]
  warning_checks integer [not null]
  calculated_at timestamp [not null]
  created_at timestamp [not null, default: `now()`]
  updated_at timestamp [not null, default: `now()`]

  indexes {
    (source_id, organisation_id) [unique]
  }
}
```

## 2. Elba API Changes

### 2.1 New Schema Definitions

Create new schemas in `/apps/elba-api/src/schemas/configuration-checks.ts`:

```typescript
import { z } from 'zod';
import { jsonSchema } from './common';

// Enums matching database
export const checkCategorySchema = z.enum([
  'authentication',
  'access_control',
  'data_protection',
  'admin_security',
  'compliance',
  'network_security',
]);

export const severityLevelSchema = z.enum(['critical', 'high', 'medium', 'low']);

export const checkStatusSchema = z.enum(['pass', 'fail', 'warning', 'error', 'not_applicable']);

// Configuration check schema
export const configurationCheckSchema = z.object({
  checkHandle: z.string().min(1).max(100),
  status: checkStatusSchema,
  details: z.string().optional(),
  checkedAt: z.string().datetime(),
  metadata: jsonSchema,
});

export type ConfigurationCheck = z.infer<typeof configurationCheckSchema>;

// Batch update schema
export const upsertConfigurationChecksDataSchema = z.object({
  organisationId: z.string().uuid(),
  checks: z.array(configurationCheckSchema).min(1).max(1000),
});

export type UpsertConfigurationChecksData = z.infer<typeof upsertConfigurationChecksDataSchema>;

// Delete schema
export const deleteConfigurationChecksDataSchema = z
  .object({
    organisationId: z.string().uuid(),
    checkHandles: z.array(z.string()).optional(),
    syncedBefore: z.string().datetime().optional(),
  })
  .refine(({ checkHandles, syncedBefore }) => Boolean(checkHandles) !== Boolean(syncedBefore), {
    message: 'Either "checkHandles" or "syncedBefore" must be provided, but not both.',
  });

export type DeleteConfigurationChecksData = z.infer<typeof deleteConfigurationChecksDataSchema>;

// Configuration definition schema (for registration)
export const configurationCheckDefinitionSchema = z.object({
  handle: z.string().min(1).max(100),
  category: checkCategorySchema,
  severity: severityLevelSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  remediationSteps: z.array(z.string()).optional(),
  documentationUrl: z.string().url().optional(),
});

export type ConfigurationCheckDefinition = z.infer<typeof configurationCheckDefinitionSchema>;
```

### 2.2 New REST API Endpoints

Create new endpoint in `/apps/elba-api/src/pages/api/rest/configuration/checks.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isApiError } from '@elba-security/shared';
import { checkApiKeyAndOrganisationId } from '#src/server/rest/shared/check-api-key-and-organisation-id';
import { checkMethod } from '#src/server/rest/shared/check-method';
import { upsertConfigurationChecks } from '#src/server/rest/configuration/upsert-checks/service';
import { deleteConfigurationChecks } from '#src/server/rest/configuration/delete-checks/service';
import {
  upsertConfigurationChecksDataSchema,
  deleteConfigurationChecksDataSchema,
} from '#src/schemas/configuration-checks';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { sourceId, sourceOrganisationId } = await checkApiKeyAndOrganisationId(req);

    if (req.method === 'POST') {
      await checkMethod({ req, res }, 'POST');

      const result = upsertConfigurationChecksDataSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: result.error.flatten(),
        });
      }

      const response = await upsertConfigurationChecks({
        sourceId,
        sourceOrganisationId,
        ...result.data,
      });

      return res.status(200).json(response);
    }

    if (req.method === 'DELETE') {
      await checkMethod({ req, res }, 'DELETE');

      const result = deleteConfigurationChecksDataSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: result.error.flatten(),
        });
      }

      const response = await deleteConfigurationChecks({
        sourceId,
        sourceOrganisationId,
        ...result.data,
      });

      return res.status(200).json(response);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (isApiError(error)) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
```

Create endpoint for check definitions in `/apps/elba-api/src/pages/api/rest/configuration/definitions.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { isApiError } from '@elba-security/shared';
import { checkApiKeyAndOrganisationId } from '#src/server/rest/shared/check-api-key-and-organisation-id';
import { checkMethod } from '#src/server/rest/shared/check-method';
import { registerConfigurationDefinitions } from '#src/server/rest/configuration/register-definitions/service';
import { configurationCheckDefinitionSchema } from '#src/schemas/configuration-checks';
import { z } from 'zod';

const registerDefinitionsSchema = z.object({
  definitions: z.array(configurationCheckDefinitionSchema).min(1).max(100),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { sourceId } = await checkApiKeyAndOrganisationId(req);

    await checkMethod({ req, res }, 'POST');

    const result = registerDefinitionsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: result.error.flatten(),
      });
    }

    const response = await registerConfigurationDefinitions({
      sourceId,
      definitions: result.data.definitions,
    });

    return res.status(200).json(response);
  } catch (error) {
    if (isApiError(error)) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
```

### 2.3 Service Layer Implementation

Create service for upserting configuration checks in `/apps/elba-api/src/server/rest/configuration/upsert-checks/service.ts`:

```typescript
import { gqlRequest } from '@elba-security/shared';
import { captureCheckout } from '@sentry/nextjs';
import { inngest } from '#src/server/inngest/client';
import type { UpsertConfigurationChecksData } from '#src/schemas/configuration-checks';
import { upsertConfigurationChecksMutation } from './data';

type UpsertConfigurationChecksParams = {
  sourceId: string;
  sourceOrganisationId: string;
} & UpsertConfigurationChecksData;

export const upsertConfigurationChecks = async ({
  sourceId,
  sourceOrganisationId,
  organisationId,
  checks,
}: UpsertConfigurationChecksParams) => {
  try {
    // Validate organisation match
    if (sourceOrganisationId !== organisationId) {
      throw new ApiError('Organisation mismatch', 403);
    }

    // Upsert checks in database
    const { insert_configuration_module_source_configuration_checks } = await gqlRequest(
      upsertConfigurationChecksMutation,
      {
        objects: checks.map((check) => ({
          source_id: sourceId,
          organisation_id: organisationId,
          check_handle: check.checkHandle,
          status: check.status,
          details: check.details,
          metadata: check.metadata,
          checked_at: check.checkedAt,
          last_synced_at: new Date().toISOString(),
        })),
        on_conflict: {
          constraint: 'source_configuration_checks_source_id_organisation_id_check_handle_key',
          update_columns: [
            'status',
            'details',
            'metadata',
            'checked_at',
            'last_synced_at',
            'version',
          ],
        },
      }
    );

    // Trigger score calculation
    await inngest.send({
      name: 'configuration.score.calculate',
      data: {
        sourceId,
        organisationId,
      },
    });

    return {
      inserted: insert_configuration_module_source_configuration_checks.affected_rows,
    };
  } catch (error) {
    captureCheckout(error);
    throw error;
  }
};
```

## 3. Integration Guide for External Sources

### 3.1 Google Workspace Integration Example

Integrations should implement configuration checks and send results to elba-api:

```typescript
// Example: Google Workspace integration sending configuration data

interface GoogleWorkspaceConfigurationChecker {
  async checkConfigurations(organisationId: string): Promise<void> {
    const checks: ConfigurationCheck[] = [];

    // Check 2FA enforcement
    const users = await this.adminSDK.users.list({ domain: this.domain });
    const totalUsers = users.data.users?.length || 0;
    const usersWithMFA = users.data.users?.filter(u => u.isEnrolledIn2Sv).length || 0;
    const mfaPercentage = (usersWithMFA / totalUsers) * 100;

    checks.push({
      checkHandle: 'google_2fa_enforcement',
      status: mfaPercentage === 100 ? 'pass' : mfaPercentage > 80 ? 'warning' : 'fail',
      details: `${usersWithMFA} of ${totalUsers} users (${mfaPercentage.toFixed(1)}%) have 2FA enabled`,
      checkedAt: new Date().toISOString(),
      metadata: {
        totalUsers,
        usersWithMFA,
        percentage: mfaPercentage,
      },
    });

    // Check super admin 2FA
    const admins = await this.adminSDK.users.list({
      domain: this.domain,
      query: 'isAdmin=true',
    });
    const adminsWithoutMFA = admins.data.users?.filter(u => !u.isEnrolledIn2Sv) || [];

    checks.push({
      checkHandle: 'google_super_admin_2fa',
      status: adminsWithoutMFA.length === 0 ? 'pass' : 'fail',
      details: adminsWithoutMFA.length > 0
        ? `${adminsWithoutMFA.length} super admin(s) without 2FA`
        : 'All super admins have 2FA enabled',
      checkedAt: new Date().toISOString(),
      metadata: {
        adminsWithoutMFA: adminsWithoutMFA.map(a => a.primaryEmail),
      },
    });

    // Send to elba-api
    await fetch(`${ELBA_API_BASE_URL}/configuration/checks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organisationId,
        checks,
      }),
    });
  }
}
```

### 3.2 Check Definition Registration

Sources must register their check definitions once during setup:

```typescript
// Register check definitions with elba-api
await fetch(`${ELBA_API_BASE_URL}/configuration/definitions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    definitions: [
      {
        handle: 'google_2fa_enforcement',
        category: 'authentication',
        severity: 'critical',
        name: '2FA Enforcement',
        description: 'Percentage of users with 2-factor authentication enabled',
        remediationSteps: [
          'Navigate to Admin Console > Security > Authentication > 2-step verification',
          'Enable "Enforcement" for your organization',
          'Set appropriate enrollment period for users',
          'Communicate change to users with instructions',
        ],
        documentationUrl: 'https://support.google.com/a/answer/9176657',
      },
      {
        handle: 'google_super_admin_2fa',
        category: 'admin_security',
        severity: 'critical',
        name: 'Super Admin 2FA',
        description: 'All super admin accounts must have 2FA enabled',
        remediationSteps: [
          'Identify super admin accounts without 2FA',
          'Contact each admin to enable 2FA immediately',
          'Consider using security keys for enhanced protection',
        ],
        documentationUrl: 'https://support.google.com/a/answer/175197',
      },
      // ... more definitions
    ],
  }),
});
```

## 4. API Specification

### 4.1 Configuration Checks Endpoint

**POST** `/api/rest/configuration/checks`

Upload configuration check results for an organisation.

**Request Headers:**

- `Authorization: Bearer <api-key>` (required)
- `Content-Type: application/json`

**Request Body:**

```json
{
  "organisationId": "550e8400-e29b-41d4-a716-446655440000",
  "checks": [
    {
      "checkHandle": "google_2fa_enforcement",
      "status": "warning",
      "details": "150 of 200 users (75%) have 2FA enabled",
      "checkedAt": "2024-01-10T10:00:00Z",
      "metadata": {
        "totalUsers": 200,
        "usersWithMFA": 150,
        "percentage": 75
      }
    }
  ]
}
```

**Response:**

```json
{
  "inserted": 1
}
```

**DELETE** `/api/rest/configuration/checks`

Delete configuration checks for an organisation.

**Request Body (Option 1 - Delete specific checks):**

```json
{
  "organisationId": "550e8400-e29b-41d4-a716-446655440000",
  "checkHandles": ["google_2fa_enforcement", "google_super_admin_2fa"]
}
```

**Request Body (Option 2 - Delete stale checks):**

```json
{
  "organisationId": "550e8400-e29b-41d4-a716-446655440000",
  "syncedBefore": "2024-01-09T00:00:00Z"
}
```

### 4.2 Configuration Definitions Endpoint

**POST** `/api/rest/configuration/definitions`

Register configuration check definitions for a source.

**Request Body:**

```json
{
  "definitions": [
    {
      "handle": "google_2fa_enforcement",
      "category": "authentication",
      "severity": "critical",
      "name": "2FA Enforcement",
      "description": "Percentage of users with 2-factor authentication enabled",
      "remediationSteps": [
        "Navigate to Admin Console > Security > Authentication",
        "Enable 2FA enforcement"
      ],
      "documentationUrl": "https://support.google.com/a/answer/9176657"
    }
  ]
}
```

## 5. Inngest Functions

Create new Inngest function to calculate configuration scores:

```typescript
// /apps/elba-api/src/server/inngest/functions/edge/configuration/calculate-score/index.ts

export const calculateConfigurationScore = inngest.createFunction(
  {
    id: 'configuration-score-calculate',
    name: 'Calculate Configuration Score',
  },
  { event: 'configuration.score.calculate' },
  async ({ event, step }) => {
    const { sourceId, organisationId } = event.data;

    await step.run('fetch-checks', async () => {
      // Fetch all checks for the source/org
      const checks = await fetchConfigurationChecks({ sourceId, organisationId });

      // Calculate scores by category
      const categoryScores = calculateCategoryScores(checks);
      const overallScore = calculateOverallScore(checks);

      // Store the scores
      await upsertConfigurationScore({
        sourceId,
        organisationId,
        overallScore,
        categoryScores,
        totalChecks: checks.length,
        passedChecks: checks.filter((c) => c.status === 'pass').length,
        failedChecks: checks.filter((c) => c.status === 'fail').length,
        warningChecks: checks.filter((c) => c.status === 'warning').length,
      });
    });
  }
);
```

## 6. Migration Plan

### Phase 1: Database Setup (Week 1)

1. Create new schema and tables
2. Update datamodel.dbml
3. Run migrations in development

### Phase 2: API Implementation (Week 2)

1. Implement schemas and validation
2. Create REST endpoints
3. Implement service layer
4. Add Inngest functions

### Phase 3: Integration Updates (Weeks 3-4)

1. Update Google Workspace integration
2. Add configuration check logic
3. Register check definitions
4. Test end-to-end flow

### Phase 4: Frontend Implementation (Weeks 5-6)

1. Implement Configuration tab
2. Add GraphQL queries
3. Build UI components
4. Add caching and performance optimizations

## 7. Security Considerations

1. **Rate Limiting**: Implement rate limits on configuration endpoints
2. **Data Validation**: Strict validation of all incoming configuration data
3. **Access Control**: Only source can update its own configuration data
4. **Audit Trail**: Log all configuration changes for compliance
5. **Encryption**: Sensitive metadata should be encrypted at rest

## 8. Performance Considerations

1. **Batch Operations**: Support batch updates up to 1000 checks per request
2. **Caching**: Cache configuration results for 24 hours
3. **Async Processing**: Use Inngest for score calculations
4. **Database Indexes**: Optimize queries with appropriate indexes
5. **Pagination**: Implement pagination for large result sets
