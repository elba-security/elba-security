import { z } from 'zod';
import { NonRetriableError } from 'inngest';
import { referenceElbaFunction } from '@elba-security/inngest';
import { env } from '@/common/env/server';
import { inngest } from '@/inngest/client';

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

export const llmResponseSchema = z.object({
  modelOutput: z.preprocess(
    safeParseJson,
    z.object({
      type: z.literal('message'),
      content: z
        .array(
          z.object({
            type: z.literal('text'),
            text: z.preprocess(
              safeParseJson,
              z.union([
                z.object({
                  applicationName: z.string().min(1),
                  isShadowIt: z.literal(true),
                }),
                z.object({
                  isShadowIt: z.literal(false),
                }),
              ])
            ),
          })
        )
        .min(1),
    })
  ),
});

export type AnalyzeEmailRequested = {
  'gmail/third_party_apps.email.analyze.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      email: string;
      message: {
        id: string;
        subject: string;
        from: string;
        to: string;
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
        event: 'gmail/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'gmail/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'gmail/third_party_apps.email.analyze.requested',
  },
  async ({ event, step }) => {
    const { region, message, organisationId, userId } = event.data;

    const response = await step.invoke('run-llm-prompt', {
      function: referenceElbaFunction(region, 'llm_prompt.run'),
      data: {
        sourceId: env.ELBA_SOURCE_ID,
        moduleHandle: 'third_party_apps',
        variables: {},
        encryptedVariables: {
          subject: message.subject,
          from: message.from,
          to: message.to,
          body: message.body,
        },
      },
    });

    const result = llmResponseSchema.safeParse(response);

    if (!result.success) {
      throw new NonRetriableError('Could not retrieve a valid response from LLM');
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- safe assertion as min length is validated in schema
    const data = result.data.modelOutput.content.at(0)!.text;

    if (data.isShadowIt) {
      await step.sendEvent('send-email-scanning-connections', {
        name: `${region}/elba/connections.updated`,
        data: {
          sourceId: env.ELBA_SOURCE_ID,
          organisationId,
          detection_method: 'email_scanning',
          apps: [
            {
              name: data.applicationName,
              users: [{ id: userId, scopes: [] }],
            },
          ],
        },
      });
    }

    return data;
  }
);
