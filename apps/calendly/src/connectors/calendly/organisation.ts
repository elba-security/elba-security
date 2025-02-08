import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { CalendlyError, CalendlyUnsupportedPlanError } from '../common/error';

// DOC: https://developer.calendly.com/api-docs/848e5e20591ee-organization
const calendlyOrganisationSchema = z.object({
  resource: z.object({
    name: z.string(),
    plan: z.string(), // basic | essentials | standard | professional | teams | enterprise
    stage: z.string(), // trial | free | paid
  }),
});

export type CalendlyOrganisation = z.infer<typeof calendlyOrganisationSchema>;

export const checkOrganisationPlan = async ({
  accessToken,
  organizationUri,
}: {
  accessToken: string;
  organizationUri: string;
}) => {
  const response = await fetch(organizationUri, {
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

  const { plan } = result.data.resource;
  const supportedPlans = ['standard', 'professional', 'teams', 'enterprise'];

  if (!supportedPlans.includes(plan)) {
    throw new CalendlyUnsupportedPlanError(`Unsupported plan '${plan}'`);
  }
};
