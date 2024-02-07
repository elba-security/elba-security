import { team } from 'dropbox';

export const membersListFirstPage = (userIds: number[]) =>
  userIds.map((id) => ({
    profile: {
      team_member_id: `dbmid:team-member-id-${id}`,
      account_id: `dbid:team-member-account-id-${id}`,
      email: `team-member-email-${id}@foo.bar`,
      email_verified: true,
      secondary_emails: [
        {
          email: `team-member-second-email-${id}@foo.com`,
          is_verified: true,
        },
        {
          email: `team-member-second-email@bar.com`,
          is_verified: false,
        },
      ],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: `team-member-given-name-${id}`,
        surname: `team-member-surname-${id}`,
        familiar_name: `team-member-familiar-name-${id}`,
        display_name: `team-member-display-name-${id}`,
        abbreviated_name: `team-member-abbreviated-name-${id}`,
      },
      membership_type: {
        '.tag': 'full',
      },
      joined_on: '2023-01-19T13:09:04Z',
      groups: [`g:000000000000${id}`],
      member_folder_id: '01234567${i}',
    },
  }));

export const membersList: team.TeamMemberInfoV2[] = membersListFirstPage([
  1, 2, 3,
]) as team.TeamMemberInfoV2[];

// Expected Result

export const elbaUsers = {
  users: [
    {
      additionalEmails: ['team-member-second-email-1@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-1',
      email: 'team-member-email-1@foo.bar',
      id: 'dbmid:team-member-id-1',
    },
    {
      additionalEmails: ['team-member-second-email-2@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-2',
      email: 'team-member-email-2@foo.bar',
      id: 'dbmid:team-member-id-2',
    },
    {
      additionalEmails: ['team-member-second-email-3@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-3',
      email: 'team-member-email-3@foo.bar',
      id: 'dbmid:team-member-id-3',
    },
  ],
};
