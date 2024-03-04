import type { User } from '@elba-security/sdk';
import type { ConfluenceGroupMember } from '@/connectors/confluence/groups';

export const formatElbaUser = (user: ConfluenceGroupMember): User => ({
  id: user.accountId,
  displayName: user.displayName || user.publicName,
  email: user.email || undefined,
  additionalEmails: [],
});
