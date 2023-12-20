import { getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const startUsersScan = inngest.createFunction(
  {
    id: 'start-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'users/start',
  },
  async ({ event, step }) => {
    const syncStartedAt = Date.now();
    const { tenantId, isFirstScan } = event.data;

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    await step.sendEvent('scan-users', {
      name: 'users/scan',
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
