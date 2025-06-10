import { inngest } from '@/inngest/client';

export type AnalyzeEmailRequested = {
  'outlook/third_party_apps.email.analyze.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      message: {
        id: string;
        subject: string;
        from: string;
        toRecipients: string[];
        body: string;
      };
    };
  };
};

export const analyzeEmail = inngest.createFunction(
  {
    id: 'analyze-email',
    retries: 3,
    rateLimit: {
      key: 'event.data.userId + "-" + event.data.message.from',
      period: '24h',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.email.analyze.requested',
  },
  () => {
    // const { region, message } = event.data;

    // const response = await step.invoke('run-llm-prompt', {
    //   function: referenceElbaFunction(region, 'llm_prompt.run'),
    //   data: {
    //     sourceId: env.ELBA_SOURCE_ID,
    //     moduleHandle: 'third_party_apps',
    //     variables: {},
    //     encryptedVariables: {
    //       subject: message.subject,
    //       from: message.from,
    //       to: message.toRecipients,
    //       body: message.body,
    //     },
    //   },
    // });

    return 'completed';
  }
);
