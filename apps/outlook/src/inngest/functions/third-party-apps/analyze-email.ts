import { NonRetriableError, referenceFunction } from 'inngest';
import { z } from 'zod/v4';
import { env } from '@/common/env/server';
import { inngest } from '@/inngest/client';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';

const safeParseJson = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    return value;
  }
};

const outputSchema = z.union([
  z.object({
    applicationName: z.string().min(1),
    isShadowIt: z.literal(true),
  }),
  z.object({
    isShadowIt: z.literal(false),
  }),
]);

export const llmResponseSchema = z.preprocess(safeParseJson, outputSchema);

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
        toRecipients: string;
        body: string;
      };
    };
  };
};

export const analyzeEmail = inngest.createFunction(
  {
    id: 'analyze-email',
    concurrency: concurrencyOption,
    retries: 3,
    rateLimit: {
      key: 'event.data.userId + "-" + event.data.message.from + "-" + event.data.organisationId',
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
      {
        event: 'outlook/sync.cancel',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.email.analyze.requested',
  },
  async ({ event, step, logger }) => {
    const { region, message, organisationId, userId } = event.data;

    const answer = await step.invoke('run-llm-prompt', {
      function: referenceFunction({
        appId: `elba-api${region === 'eu' ? '' : `-${region}`}`,
        functionId: `${region}/elba/runLlmPrompt`,
      }),
      data: {
        sourceId: env.ELBA_SOURCE_ID,
        moduleHandle: 'third_party_apps',
        variables: {
          outputSchema: JSON.stringify(z.toJSONSchema(outputSchema)),
        },
        encryptedVariables: {
          subject: message.subject,
          from: message.from,
          to: message.toRecipients,
          body: message.body,
        },
      },
    });

    const result = llmResponseSchema.safeParse(answer);

    if (!result.success) {
      logger.error('Invalid response retrieved from LLM', { answer, organisationId, userId });
      throw new NonRetriableError('Could not retrieve a valid response from LLM', {
        cause: result.error,
      });
    }

    if (result.data.isShadowIt) {
      await step.sendEvent('send-email-scanning-connections', {
        name: `${region}/elba/connections.updated`,
        data: {
          sourceId: env.ELBA_SOURCE_ID,
          organisationId,
          detection_method: 'email_scanning',
          apps: [
            {
              name: result.data.applicationName,
              users: [{ id: userId, scopes: [] }],
            },
          ],
        },
      });
    }

    return result.data;
  }
);
