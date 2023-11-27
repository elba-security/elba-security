import { DropboxResponse, team } from 'dropbox';

export const membersListFirstPage: team.TeamMemberInfoV2[] = [
  {
    profile: {
      team_member_id: 'dbmid:AACC6WVq1Tsexu2TGMAZx5PgoghPb1wZgFo',
      account_id: 'dbid:AAD_9YnwBV13B9rm8_9HN4sf5wu4Sh9DCXs',
      email: 'member-1@gmail.com',
      email_verified: true,
      secondary_emails: [
        {
          email: 'sample-email-1@xys.com',
          is_verified: true,
        },
        {
          email: 'sample-email-2@jux.com',
          is_verified: false,
        },
      ],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-1',
        surname: 'member-1-surname',
        familiar_name: 'member-1-familiar-name',
        display_name: 'member-1-display-name',
        abbreviated_name: 'member-1-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      joined_on: '2023-01-19T13:09:04Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3377242017',
    },
  },
  {
    profile: {
      team_member_id: 'dbmid:AAAZAgKIZ9LjPeus0zIQQlJGBTMjKvxgaeo',
      account_id: 'dbid:AABkGc6l9V43_NjUTjRAZcCffUGzw0UAnMQ',
      email: 'member-2@gmail.com',
      email_verified: true,
      secondary_emails: [
        {
          email: 'sample-email-10@xys.com',
          is_verified: true,
        },
        {
          email: 'sample-email-12@jux.com',
          is_verified: false,
        },
      ],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-2',
        surname: 'member-2-surname',
        familiar_name: 'member-2-familiar-name',
        display_name: 'member-2-display-name',
        abbreviated_name: 'member-2-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      joined_on: '2023-01-26T12:24:56Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3433420049',
    },
  },
  {
    profile: {
      team_member_id: 'dbmid:AACsa3ltyVlwAHUXtt4atxIOCU7P-87i5to',
      account_id: 'dbid:AACSev-O_EZQJRSmoToPQoFJfwaqzrzBnd8',
      email: 'member-3@yahoo.com',
      email_verified: false,
      secondary_emails: [],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: '',
        surname: '',
        familiar_name: '',
        display_name: '',
        abbreviated_name: '',
      },
      membership_type: {
        '.tag': 'full',
      },
      invited_on: '2023-01-26T12:30:34Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3432693249',
    },
  },
];

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

export const membersListFirstPageResult: Partial<DropboxResponse<team.MembersListV2Result>> = {
  result: {
    members: membersListFirstPage,
    cursor: 'AAAZIQAQj4t_iNsWZgIkK04nHtZ_nP7',
    has_more: true,
  },
};

export const membersListSecondPageResult: Partial<DropboxResponse<team.MembersListV2Result>> = {
  result: {
    members: membersListSecondPage,
    cursor: 'IkK04nHtZ_nP7ztnbGp3UxUYpBwQAajh1W0JyWupHvrLDAW4ju',
    has_more: true,
  },
};

export const membersListWithoutPagination: Partial<DropboxResponse<team.MembersListV2Result>> = {
  result: {
    members: membersListFirstPage,
    cursor: 'IkK04nHtZ_nP7ztnbGp3UxUYpBwQAajh1W0JyWup4ju',
    has_more: false,
  },
};
