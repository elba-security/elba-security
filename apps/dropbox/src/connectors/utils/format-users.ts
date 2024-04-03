import type { User } from '@elba-security/sdk';
import type { TeamMembers } from '@/inngest/functions/users/types';

export const formatUsers = (members: TeamMembers) => {
  // Invited members are not yet part of the team
  const filteredMembers = members.filter(({ profile }) => {
    return (
      ['active', 'suspended'].includes(profile.status['.tag']) && Boolean(profile.name.display_name)
    );
  });

  return filteredMembers.map<User>(({ profile }) => {
    const {
      team_member_id,
      email,
      secondary_emails,
      name: { display_name },
    } = profile;

    return {
      id: team_member_id,
      email,
      displayName: display_name,
      additionalEmails: secondary_emails?.map(({ email: secondEmail }) => secondEmail) || [],
    };
  });
};
