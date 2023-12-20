import type { User } from '@elba-security/sdk';
import type { SafeMicrosoftGraphUser } from '@/repositories/microsoft/graph-api';
import { getPaginatedUsersByTenantId } from '@/repositories/microsoft/graph-api';

const formatUserUpsertInput = (user: SafeMicrosoftGraphUser): User => {
  return {
    id: user.id,
    email: user.mail || user.userPrincipalName || undefined,
    displayName: user.displayName,
    additionalEmails: user.otherMails ?? [],
  };
};

export const scanUsersByTenantId = async ({
  accessToken,
  tenantId,
  pageLink,
}: {
  accessToken: string;
  tenantId: string;
  pageLink: string | undefined;
}) => {
  const response = await getPaginatedUsersByTenantId({
    accessToken,
    tenantId,
    pageLink,
  });
  const formattedUsers = response.value.map(formatUserUpsertInput);

  return { formattedUsers, nextLink: response['@odata.nextLink'] };
};
