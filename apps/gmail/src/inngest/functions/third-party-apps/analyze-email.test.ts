import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as elbaInngest from '@elba-security/inngest';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { env } from '@/common/env/server';
import { analyzeEmail, type AnalyzeEmailRequested, llmResponseSchema } from './analyze-email';

describe('llmResponseSchema.safeParse', () => {
  test('should return success true when response from llm is valid', () => {
    expect(llmResponseSchema.safeParse('{"isShadowIt":false}')).toMatchObject({ success: true });
  });

  test('should return success false when response from llm is valid', () => {
    expect(
      llmResponseSchema.safeParse({
        response: {
          modelOutput: '[{"foo":false}]',
          recordId: 'vzadcasxecd',
        },
      })
    ).toMatchObject({ success: false });
  });
});

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';

const shadowItMessage = {
  id: 'shadow-it-id',
  from: 'from',
  to: 'to',
  body: 'body',
  subject: 'subject',
};

const nonShadowItMessage = {
  id: 'shadow-it-id',
  from: 'foo',
  to: 'to',
  body: 'bar',
  subject: 'lorem',
};

const hallucinationMessage = {
  id: 'hallucination',
  from: 'hallucination',
  to: 'to',
  body: 'bar',
  subject: 'lorem',
};

const eventData: AnalyzeEmailRequested['gmail/third_party_apps.email.analyze.requested']['data'] = {
  organisationId,
  region: 'eu',
  userId: 'user-id',
  email: 'user@foo.com',
  message: shadowItMessage,
};

describe('analyzeEmail', () => {
  const mockFunction = createInngestFunctionMock(
    analyzeEmail,
    'gmail/third_party_apps.email.analyze.requested'
  );

  const setup = ({ data = eventData }: { data?: Parameters<typeof mockFunction>[0] }) => {
    vi.spyOn(elbaInngest, 'referenceElbaFunction').mockImplementation(
      // @ts-expect-error -- this is a mock
      (region: string, functionId: string) => {
        if (functionId !== 'llm_prompt.run') {
          throw new Error('unsuported function');
        }

        return inngest.createFunction(
          {
            id: functionId,
          },
          // @ts-expect-error -- this is a mock
          { event: `${region}/elba/llm_prompt.run` },
          ({ event }) => {
            const {
              sourceId,
              moduleHandle,
              encryptedVariables: { from, to, body, subject },
            } = event.data as {
              sourceId: string;
              moduleHandle: string;
              encryptedVariables: Record<string, unknown>;
            };

            if (sourceId !== env.ELBA_SOURCE_ID || moduleHandle !== 'third_party_apps') {
              throw new NonRetriableError('Could not retrieve llm_prompt');
            }

            if (from === 'hallucination') {
              return 'The recipe of banana bread includes...';
            }

            if (
              from === shadowItMessage.from &&
              to === shadowItMessage.to &&
              body === shadowItMessage.body &&
              subject === shadowItMessage.subject
            ) {
              return JSON.stringify({
                isShadowIt: true,
                applicationName: 'application-name',
              });
            }

            return JSON.stringify({
              isShadowIt: false,
            });
          }
        );
      }
    );

    return mockFunction(data);
  };

  test('should send app to elba when email is shadow it', async () => {
    const [result, { step }] = setup({
      data: {
        ...eventData,
        message: shadowItMessage,
      },
    });

    await expect(result).resolves.toMatchObject({
      isShadowIt: true,
      applicationName: 'application-name',
    });

    expect(step.sendEvent).toHaveBeenCalledWith(expect.any(String), {
      name: 'eu/elba/connections.updated',
      data: {
        sourceId: env.ELBA_SOURCE_ID,
        organisationId,
        detection_method: 'email_scanning',
        apps: [
          {
            name: 'application-name',
            users: [{ id: eventData.userId, scopes: [] }],
          },
        ],
      },
    });
  });

  test('should not send app to elba when email is not shadow it', async () => {
    const [result, { step }] = setup({
      data: {
        ...eventData,
        message: nonShadowItMessage,
      },
    });

    await expect(result).resolves.toMatchObject({
      isShadowIt: false,
    });

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'eu/elba/connections.updated',
      })
    );
  });

  test('should abort when the llm hallucinate a non valid JSON', async () => {
    const [result] = setup({
      data: {
        ...eventData,
        message: hallucinationMessage,
      },
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
  });
});
