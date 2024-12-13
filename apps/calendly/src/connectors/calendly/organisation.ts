import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { CalendlyError, CalendlyUnsupportedPlanError } from '../common/error';

const calendlyOrganisationSchema = z.object({
  resource: z.object({
    name: z.string(),
    plan: z.string(), // basic | essentials | standard | professional | teams | enterprise
    stage: z.string(), // trial | free |paid
  }),
});

export type CalendlyOrganisation = z.infer<typeof calendlyOrganisationSchema>;

export const getOrganisation = async ({
  accessToken,
  organizationUri,
}: {
  accessToken: string;
  organizationUri: string;
}) => {
  const url = new URL(organizationUri);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new CalendlyError('Could not retrieve organisation details', { response });
  }

  const resData: unknown = await response.json();

  const result = calendlyOrganisationSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Could not parse organisation response', { resData });
    throw new CalendlyError('Could not parse organisation response');
  }

  const { plan, stage } = result.data.resource;
  // DOC: https://developer.calendly.com/api-docs/848e5e20591ee-organization
  // Available: plans: basic | essentials | standard | professional | teams | enterprise
  // Available: stages: trial | free | paid
  if (['basic', 'essentials'].includes(plan) || stage !== 'paid') {
    throw new CalendlyUnsupportedPlanError('User is not an admin');
  }

  return { plan, stage };
};
