import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { DbtlabsError } from '../common/error';

const dbtlabsOrganisationSchema = z.object({
  data: z.object({
    name: z.string(),
    plan: z.string(), // cancelled | cancelled_2022 | developer | developer_2022 | free | enterprise | team | team_2022 | team_annual | trial | trial_2022
  }),
});

export type DbtlabsOrganisation = z.infer<typeof dbtlabsOrganisationSchema>;

export const getOrganisation = async ({
  accountId,
  accessUrl,
  serviceToken,
}: {
  accountId: string;
  accessUrl: string;
  serviceToken: string;
}) => {
  const url = new URL(`${accessUrl}/api/v2/accounts/${accountId}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
  });

  if (!response.ok) {
    throw new DbtlabsError('Could not retrieve organisation details', { response });
  }

  const resData: unknown = await response.json();

  const result = dbtlabsOrganisationSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Could not parse organisation response', { resData });
    throw new DbtlabsError('Could not parse organisation response');
  }

  return result.data.data;
};
