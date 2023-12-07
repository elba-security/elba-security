import { inngest } from '@/common/clients/inngest';
import { getExpiringDropboxTokens } from './data';

export const scheduleRefreshTokensJobs = inngest.createFunction(
  { id: 'schedule-token-refresh-jobs' },
  { cron: '* * * * *' },
  async ({ step }) => {
    const organisations = await getExpiringDropboxTokens();
    console.log('--------------SCHEDULE REFRESH TOKENS-----------');
    console.log(organisations);
    console.log('------------------------------------------------');
    if (organisations.length > 0) {
      await step.sendEvent(
        'run-refresh-tokens',
        organisations.map((organisation) => ({
          name: 'tokens/run-refresh-tokens',
          data: { ...organisation, isFirstScan: false },
        }))
      );
    }

    return {
      organisations,
    };
  }
);
