import { User } from '@/repositories/elba/resources/users/types';
import type { OrganizationMember } from '@/repositories/github/organization.repository';

export const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});
