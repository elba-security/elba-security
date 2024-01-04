import { DropboxResponse, team } from 'dropbox';

type FetchUsersResponse = {
  members: team.TeamMemberInfoV2[];
  nextCursor: string;
  hasMore: boolean;
};

export const membersListFirstPage = (users: number[]) =>
  users.map((id) => ({
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

export const membersListSecondPage: team.TeamMemberInfoV2[] = [
  {
    profile: {
      team_member_id: 'dbmid:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      account_id: 'dbid:zdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpva',
      email: 'member-20@elba.security',
      email_verified: false,
      secondary_emails: [],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-20-name',
        surname: 'member-20-surname',
        familiar_name: 'member-20-familiar-name',
        display_name: 'member-20-display-name',
        abbreviated_name: 'member-20-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      invited_on: '2023-01-30T19:05:23Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3465994753',
    },
  },
  {
    profile: {
      team_member_id: 'dbmid:wRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      account_id: 'dbid:zdWIiOiIxMjM0NTY3ODasdaUOIawibmFtZSI6Ikpva',
      email: 'member-21@elba.security',
      email_verified: false,
      secondary_emails: [],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-21-name',
        surname: 'member-21-surname',
        familiar_name: 'member-21-familiar-name',
        display_name: 'member-21-display-name',
        abbreviated_name: 'member-21-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      invited_on: '2023-01-30T19:05:23Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3567894753',
    },
  },
];

// Sent to updateSourceUser Action and  insert_dropbox_users_info
export type MockUserPool = {
  id: string;
  email: string;
  displayName: string;
  additionalEmails: string[];
};

export const mockUserPoolFirstPageResult: MockUserPool[] = [
  {
    id: 'dbmid:AACC6WVq1Tsexu2TGMAZx5PgoghPb1wZgFo',
    email: 'member-1@gmail.com',
    displayName: 'member-1-display-name',
    additionalEmails: ['sample-email-1@xys.com', 'sample-email-2@jux.com'],
  },
  {
    id: 'dbmid:AAAZAgKIZ9LjPeus0zIQQlJGBTMjKvxgaeo',
    email: 'member-2@gmail.com',
    displayName: 'member-2-display-name',
    additionalEmails: ['sample-email-10@xys.com', 'sample-email-12@jux.com'],
  },
  {
    id: 'dbmid:AACsa3ltyVlwAHUXtt4atxIOCU7P-87i5to',
    email: 'member-3@yahoo.com',
    displayName: '',
    additionalEmails: [],
  },
];

export const mockUserPoolSecondPage: MockUserPool[] = [
  {
    id: 'dbmid:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    email: 'member-20@elba.security',
    displayName: 'member-20-display-name',
    additionalEmails: [],
  },
  {
    id: 'dbmid:wRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    email: 'member-21@elba.security',
    displayName: 'member-21-display-name',
    additionalEmails: [],
  },
];

export const mockUserPoolWithoutPagination = mockUserPoolFirstPageResult;

export const membersListFirstPageResult: FetchUsersResponse = {
  members: membersListFirstPage([1, 2, 3]) as team.TeamMemberInfoV2[],
  nextCursor: 'cursor-1',
  hasMore: true,
};

export const membersListSecondPageResult: Partial<DropboxResponse<team.MembersListV2Result>> = {
  result: {
    members: membersListSecondPage,
    cursor: 'cursor-2',
    has_more: true,
  },
};

export const membersListWithoutPagination: FetchUsersResponse = {
  members: membersListFirstPage([1, 2, 3]) as team.TeamMemberInfoV2[],
  nextCursor: 'cursor-3',
  hasMore: false,
};
