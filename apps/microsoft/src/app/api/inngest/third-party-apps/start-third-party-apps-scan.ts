import { getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const startThirdPartyAppsScan = inngest.createFunction(
  {
    id: 'start-third-party-apps-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'third-party-apps/start',
  },
  async ({ event, step }) => {
    const syncStartedAt = Date.now();
    const { tenantId, isFirstScan } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );

    await step.sendEvent('scan-third-party-apps', {
      name: 'third-party-apps/scan',
      data: {
        tenantId,
        organizationId: organization.elbaOrganizationId,
        syncStartedAt: syncStartedAt.toString(),
        isFirstScan,
        accessToken: token.accessToken,
      },
    });
    return { status: 'started' };
  }
);
