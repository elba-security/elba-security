# Feature Specification: Configuration Recommendations for Connected Sources

## Executive Summary

This document outlines the specifications for a new feature that provides security configuration recommendations for connected SaaS applications in Elba. The feature will display configuration checks and compliance recommendations in a new "Configuration" tab within the source settings page, starting with Google Workspace integration.

## 1. Problem Statement

Organizations using multiple SaaS applications often struggle to maintain consistent security configurations across all platforms. Security teams need visibility into:

- Whether security best practices are being followed
- Configuration drift from recommended baselines
- Compliance with industry standards
- Actionable steps to improve security posture

## 2. Solution Overview

Add a "Configuration" tab to the source settings page that:

- Runs automated security configuration checks
- Displays results with clear pass/fail indicators
- Provides remediation guidance
- Tracks configuration health over time
- Generates compliance reports

## 3. User Stories

### As a Security Administrator

- I want to see the security configuration status of my connected Google Workspace
- I want to know which settings don't meet security best practices
- I want clear guidance on how to fix configuration issues
- I want to track configuration compliance over time

### As a Compliance Officer

- I want to generate reports showing configuration compliance
- I want to map configurations to compliance frameworks
- I want historical data to demonstrate continuous compliance

## 4. Technical Architecture

### 4.1 API Integration

#### Google Workspace Admin SDK APIs

**Directory API** (`https://admin.googleapis.com/admin/directory/v1/`)

- `GET /users` - Retrieve user list with security settings
- `GET /users/{userKey}` - Get detailed user security configuration
- `GET /groups` - Check group security settings
- `GET /domains` - Verify domain configuration

**Reports API** (`https://admin.googleapis.com/admin/reports/v1/`)

- `GET /activity/users/{userKey}/applications/login` - Login security events
- `GET /activity/users/all/applications/token` - OAuth token grants
- `GET /activity/users/all/applications/admin` - Admin activity audit
- `GET /usage/users/all/dates/{date}` - Security metrics usage

**Admin Settings API** (Limited availability)

- Password policy configuration
- Session management settings
- Security defaults

### 4.2 Data Model

```typescript
// Database schema
interface SourceConfigurationCheck {
  id: string;
  organisation_id: string;
  source_id: string;
  check_id: string;
  category: ConfigurationCategory;
  name: string;
  description: string;
  severity: SeverityLevel;
  status: CheckStatus;
  details: Json;
  remediation_steps: string[];
  documentation_url: string;
  checked_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface SourceConfigurationScore {
  id: string;
  organisation_id: string;
  source_id: string;
  overall_score: number; // 0-100
  category_scores: {
    authentication: number;
    access_control: number;
    data_protection: number;
    admin_security: number;
  };
  calculated_at: Date;
  created_at: Date;
}

// Enums
enum ConfigurationCategory {
  AUTHENTICATION = 'authentication',
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  ADMIN_SECURITY = 'admin_security',
}

enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

enum CheckStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
  ERROR = 'error',
  CHECKING = 'checking',
}
```

### 4.3 Backend Implementation

#### Inngest Functions

```typescript
// New Inngest function to run configuration checks
export const runSourceConfigurationChecks = inngest.createFunction(
  {
    id: 'source-configuration-checks-run',
    name: 'Run Source Configuration Checks',
  },
  { event: 'source.configuration.check.requested' },
  async ({ event, step }) => {
    const { sourceId, organisationId } = event.data;

    // Run checks in parallel
    const results = await step.run('run-checks', async () => {
      return Promise.all([
        checkAuthentication(sourceId),
        checkAccessControl(sourceId),
        checkDataProtection(sourceId),
        checkAdminSecurity(sourceId),
      ]);
    });

    // Store results
    await step.run('store-results', async () => {
      await storeConfigurationResults(results);
    });

    // Calculate score
    await step.run('calculate-score', async () => {
      await calculateConfigurationScore(sourceId);
    });
  }
);
```

#### Check Implementations

```typescript
// Example: Check 2FA enforcement
async function check2FAEnforcement(sourceId: string): Promise<ConfigurationCheck> {
  const client = await getGoogleAdminClient(sourceId);

  // Get all users
  const users = await client.users.list({
    domain: client.domain,
    maxResults: 500,
    projection: 'full',
  });

  // Calculate 2FA statistics
  const total = users.users.length;
  const with2FA = users.users.filter((u) => u.isEnrolledIn2Sv).length;
  const percentage = (with2FA / total) * 100;

  return {
    id: 'google-2fa-enforcement',
    name: '2FA Enforcement',
    description: 'Percentage of users with 2-factor authentication enabled',
    category: 'authentication',
    severity: percentage < 50 ? 'critical' : percentage < 80 ? 'high' : 'medium',
    status: percentage === 100 ? 'pass' : percentage > 80 ? 'warning' : 'fail',
    details: `${with2FA} of ${total} users (${percentage.toFixed(1)}%) have 2FA enabled`,
    remediationSteps: [
      'Navigate to Admin Console > Security > Authentication > 2-step verification',
      'Enable "Enforcement" for your organization',
      'Set appropriate enrollment period for users',
      'Communicate change to users with instructions',
    ],
    documentationUrl: 'https://support.google.com/a/answer/9176657',
  };
}
```

## 5. Configuration Checks Detail

### 5.1 Google Workspace Checks

#### Critical Severity

| Check Name                | Description                                    | API Endpoint          | Pass Criteria                    |
| ------------------------- | ---------------------------------------------- | --------------------- | -------------------------------- |
| Super Admin 2FA           | All super admin accounts must have 2FA enabled | Directory API: /users | 100% of admins with 2FA          |
| Password Policy Strength  | Minimum password requirements                  | Admin Settings API    | Min 12 chars, complexity enabled |
| External Sharing Controls | File sharing with external users               | Drive API: /about     | Restricted to trusted domains    |

#### High Severity

| Check Name              | Description                           | API Endpoint          | Pass Criteria           |
| ----------------------- | ------------------------------------- | --------------------- | ----------------------- |
| User 2FA Coverage       | Percentage of users with 2FA          | Directory API: /users | >80% enrolled           |
| OAuth App Audit         | Review of third-party app permissions | Reports API: /token   | No high-risk apps       |
| Admin Account Isolation | Super admins use dedicated accounts   | Directory API: /users | Separate admin accounts |

#### Medium Severity

| Check Name           | Description                    | API Endpoint                  | Pass Criteria     |
| -------------------- | ------------------------------ | ----------------------------- | ----------------- |
| Password Rotation    | Password expiration policy     | Admin Settings API            | 90-day expiration |
| Mobile Device Policy | MDM settings for mobile access | Directory API: /mobiledevices | Policy enforced   |
| Audit Log Retention  | Comprehensive logging enabled  | Reports API: /activities      | All logs enabled  |

#### Low Severity

| Check Name       | Description                       | API Endpoint         | Pass Criteria      |
| ---------------- | --------------------------------- | -------------------- | ------------------ |
| Session Timeout  | Idle session configuration        | Admin Settings API   | 8-hour timeout     |
| Email Forwarding | Automatic forwarding restrictions | Gmail API: /settings | Disabled for users |

## 6. Frontend Implementation

### 6.1 Component Structure

```
/dashboard/security/common/sources/settings/
├── configuration/
│   ├── index.tsx                    # Main configuration tab
│   ├── components/
│   │   ├── ConfigurationOverview.tsx    # Score and summary
│   │   ├── ConfigurationCheckList.tsx   # List of all checks
│   │   ├── ConfigurationCheckCard.tsx   # Individual check display
│   │   ├── RemediationModal.tsx         # Detailed fix instructions
│   │   └── ConfigurationReport.tsx      # Export functionality
│   ├── hooks/
│   │   ├── useConfigurationChecks.ts
│   │   └── useConfigurationScore.ts
│   └── data.ts                      # GraphQL queries
```

### 6.2 UI Components

#### Configuration Overview Card

```tsx
interface ConfigurationOverviewProps {
  score: number;
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date;
  criticalIssues: number;
  highIssues: number;
}
```

#### Configuration Check Card

```tsx
interface ConfigurationCheckCardProps {
  check: ConfigurationCheck;
  onRemediate: () => void;
  onDismiss: () => void;
  onRecheck: () => void;
}
```

### 6.3 User Interface Flow

1. **Initial State**

   - User clicks "Configuration" tab
   - Show loading skeleton while checks run
   - Display cached results if available (<24 hours old)

2. **Results Display**

   - Overview card with score and trends
   - Categorized check results
   - Filters for severity and status
   - Sort by severity, category, or name

3. **Interaction**
   - Expand check for details
   - Click "Fix Now" for remediation steps
   - "Run Checks" to refresh manually
   - "Export Report" for documentation

## 7. API Endpoints

### 7.1 REST API Endpoints

```typescript
// Get configuration checks for a source
GET /api/sources/{sourceId}/configuration-checks
Response: {
  checks: ConfigurationCheck[]
  score: ConfigurationScore
  lastCheckedAt: Date
}

// Trigger new configuration check
POST /api/sources/{sourceId}/configuration-checks/run
Response: {
  jobId: string
  status: 'queued' | 'running'
}

// Get configuration report
GET /api/sources/{sourceId}/configuration-report
Query params: {
  format: 'pdf' | 'csv' | 'json'
  dateRange?: string
}
```

### 7.2 GraphQL Queries

```graphql
query GetSourceConfigurationChecks($sourceId: ID!) {
  sourceConfigurationChecks(sourceId: $sourceId) {
    checks {
      id
      name
      category
      severity
      status
      details
      remediationSteps
      documentationUrl
      checkedAt
    }
    score {
      overall
      categoryScores {
        authentication
        accessControl
        dataProtection
        adminSecurity
      }
      trend
      calculatedAt
    }
  }
}

mutation RunConfigurationChecks($sourceId: ID!) {
  runSourceConfigurationChecks(sourceId: $sourceId) {
    jobId
    status
  }
}
```

## 8. Security Considerations

1. **API Access**

   - Requires admin consent for Google Workspace
   - Minimal required scopes only
   - Read-only access to configuration

2. **Data Storage**

   - Configuration results encrypted at rest
   - PII excluded from check details
   - Results retained for 90 days

3. **Access Control**
   - Only organization admins can view
   - Audit log for all check runs
   - No automated remediation without approval

## 9. Performance Requirements

1. **Check Execution**

   - Complete all checks within 60 seconds
   - Parallel execution where possible
   - Progress indicators for long-running checks

2. **Caching**

   - Results cached for 24 hours
   - Manual refresh available
   - Stale-while-revalidate strategy

3. **Scalability**
   - Queue-based check execution
   - Rate limiting for API calls
   - Pagination for large result sets

## 10. Success Metrics

1. **Adoption**

   - 80% of organizations run checks monthly
   - 50% improve score within 90 days

2. **Performance**

   - <60 second check completion
   - <200ms page load time
   - 99.9% availability

3. **Business Impact**
   - 30% reduction in configuration-related incidents
   - 50% faster compliance audits
   - Improved security posture scores

## 11. Implementation Timeline

### Phase 1 (Weeks 1-4)

- Backend infrastructure
- Google Workspace check implementation
- Basic UI components

### Phase 2 (Weeks 5-8)

- Complete UI implementation
- Caching and performance optimization
- Testing and bug fixes

### Phase 3 (Weeks 9-12)

- Report generation
- Historical tracking
- Documentation and training

### Phase 4 (Future)

- Additional source support (Microsoft 365, Okta)
- Automated remediation
- Compliance framework mapping

## 12. Open Questions

1. Should we implement automated remediation for low-risk fixes?
2. How long should we retain historical configuration data?
3. Should checks run automatically on a schedule?
4. What level of detail should be included in exported reports?
5. Should we integrate with existing ticketing systems for remediation tracking?

## Appendix A: Mock UI Designs

[Include mockups of the Configuration tab interface]

## Appendix B: Sample API Responses

[Include example JSON responses for each endpoint]

## Appendix C: Compliance Mapping

[Map configuration checks to SOC2, ISO 27001, etc.]
