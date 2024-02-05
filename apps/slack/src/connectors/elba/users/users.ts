import type { User } from '@elba-security/sdk';
import type { SlackMember } from '@/connectors/slack/members';

export const formatUser = (slackMember: SlackMember): User => {
  return {
    id: slackMember.id,
    displayName: slackMember.real_name,
    email: slackMember.profile.email,
    additionalEmails: [],
  };
};
