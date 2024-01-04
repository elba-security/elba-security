import { team } from 'dropbox/types/dropbox_types';
type SimplifiedTeamMemberInfo = {
  profile: Pick<
    team.TeamMemberInfoV2['profile'],
    | 'team_member_id'
    | 'account_id'
    | 'email'
    | 'secondary_emails'
    | 'name'
    | 'membership_type'
    | 'status'
  >;
};

export const membersListFirstPage: SimplifiedTeamMemberInfo[] = Array.from(
  { length: 3 },
  (_, i) => {
    const idx = i + 1;
    return {
      profile: {
        team_member_id: `dbmid:team-member-id-${idx}`,
        account_id: 'dbid:account-id-1',
        email: `team-member-id-email-${idx}`,
        secondary_emails: [
          {
            email: `secondary-email-alpha-${idx}@alpha.com`,
            is_verified: true,
          },
          {
            email: `secondary-email-beta-${idx}@beta.com`,
            is_verified: true,
          },
        ],
        name: {
          given_name: `given-name-${idx}`,
          surname: `surname-${idx}`,
          familiar_name: `familiar-name-${idx}`,
          display_name: `display-name-${idx}`,
          abbreviated_name: `abbreviated-name-${idx}`,
        },
        membership_type: {
          '.tag': 'full',
        },
        status: {
          '.tag': 'active',
        },
      },
    };
  }
);

export const membersDbxResponseWithoutPagination = {
  result: {
    members: membersListFirstPage,
    cursor: 'team-member-second-page-cursor',
    has_more: false,
  },
};

// Expected Result
export const fetchUsersMockResponse = {
  hasMore: false,
  members: [
    {
      profile: {
        account_id: 'dbid:account-id-1',
        email: 'team-member-id-email-1',
        membership_type: {
          '.tag': 'full',
        },
        name: {
          abbreviated_name: 'abbreviated-name-1',
          display_name: 'display-name-1',
          familiar_name: 'familiar-name-1',
          given_name: 'given-name-1',
          surname: 'surname-1',
        },
        secondary_emails: [
          {
            email: 'secondary-email-alpha-1@alpha.com',
            is_verified: true,
          },
          {
            email: 'secondary-email-beta-1@beta.com',
            is_verified: true,
          },
        ],
        status: {
          '.tag': 'active',
        },
        team_member_id: 'dbmid:team-member-id-1',
      },
    },
    {
      profile: {
        account_id: 'dbid:account-id-1',
        email: 'team-member-id-email-2',
        membership_type: {
          '.tag': 'full',
        },
        name: {
          abbreviated_name: 'abbreviated-name-2',
          display_name: 'display-name-2',
          familiar_name: 'familiar-name-2',
          given_name: 'given-name-2',
          surname: 'surname-2',
        },
        secondary_emails: [
          {
            email: 'secondary-email-alpha-2@alpha.com',
            is_verified: true,
          },
          {
            email: 'secondary-email-beta-2@beta.com',
            is_verified: true,
          },
        ],
        status: {
          '.tag': 'active',
        },
        team_member_id: 'dbmid:team-member-id-2',
      },
    },
    {
      profile: {
        account_id: 'dbid:account-id-1',
        email: 'team-member-id-email-3',
        membership_type: {
          '.tag': 'full',
        },
        name: {
          abbreviated_name: 'abbreviated-name-3',
          display_name: 'display-name-3',
          familiar_name: 'familiar-name-3',
          given_name: 'given-name-3',
          surname: 'surname-3',
        },
        secondary_emails: [
          {
            email: 'secondary-email-alpha-3@alpha.com',
            is_verified: true,
          },
          {
            email: 'secondary-email-beta-3@beta.com',
            is_verified: true,
          },
        ],
        status: {
          '.tag': 'active',
        },
        team_member_id: 'dbmid:team-member-id-3',
      },
    },
  ],
  nextCursor: 'team-member-second-page-cursor',
};
