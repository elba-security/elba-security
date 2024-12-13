import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { CalendlyError, CalendlyUnsupportedPlanError } from '../common/error';
import { getOrganisation } from './organisation';

const validToken = 'test-token';
const organizationUri = 'https://api.calendly.com/organizations/012345678901234567890';

const setup = ({
  plan = 'teams',
  stage = 'paid',
}: {
  plan?: string;
  stage?: string;
} = {}) => {
  server.use(
    http.get(organizationUri, ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
        return new Response(undefined, { status: 401 });
      }
      return Response.json({
        resource: {
          uri: organizationUri,
          name: 'Team name',
          plan,
          stage,
          created_at: '2019-01-02T03:04:05.678123Z',
          updated_at: '2019-08-07T06:05:04.321123Z',
        },
      });
    })
  );
};

describe('getOrganisation', () => {
  test('should return correct organisation details', async () => {
    setup();
    await expect(
      getOrganisation({ accessToken: validToken, organizationUri })
    ).resolves.toStrictEqual({
      plan: 'teams',
      stage: 'paid',
    });
  });
  test('should throws when the plan is basic', async () => {
    setup({
      plan: 'basic',
    });
    await expect(
      getOrganisation({ accessToken: validToken, organizationUri })
    ).rejects.toBeInstanceOf(CalendlyUnsupportedPlanError);
  });

  test('should throws when the stage is trial', async () => {
    setup({
      stage: 'trial',
    });
    await expect(
      getOrganisation({ accessToken: validToken, organizationUri })
    ).rejects.toBeInstanceOf(CalendlyUnsupportedPlanError);
  });

  test('should throws when the token is invalid', async () => {
    setup();
    await expect(
      getOrganisation({ accessToken: 'foo-bar', organizationUri })
    ).rejects.toBeInstanceOf(CalendlyError);
  });
});
