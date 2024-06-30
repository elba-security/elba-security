export const createLinkedApps = ({
  length,
  startFrom = 0,
}: {
  length: number;
  startFrom?: number;
}) => {
  // Returns an array of linked apps for a team member
  const memberApps = Array.from({ length }, (__, j) => ({
    app_id: `app-id-${startFrom + j}`,
    app_name: `app-name-${startFrom + j}`,
    linked: `linked-${startFrom + j}`,
    publisher: `publisher-${startFrom + j}`,
    publisher_url: `publisher-url-${startFrom + j}`,
  }));

  // Returns an array of linked apps for a team members
  const membersApps = Array.from({ length }, (_, i) => ({
    team_member_id: `team-member-id-${startFrom + i}`,
    linked_api_apps: memberApps,
  }));

  return {
    memberApps,
    membersApps,
  };
};

export const createMockUserApps = [
  {
    id: 'app-id-0',
    name: 'app-name-0',
    publisherName: 'publisher-0',
    url: 'publisher-url-0',
    users: [
      {
        createdAt: 'linked-0',
        id: 'team-member-id-0',
        scopes: [],
      },
      {
        createdAt: 'linked-0',
        id: 'team-member-id-1',
        scopes: [],
      },
    ],
  },
  {
    id: 'app-id-1',
    name: 'app-name-1',
    publisherName: 'publisher-1',
    url: 'publisher-url-1',
    users: [
      {
        createdAt: 'linked-1',
        id: 'team-member-id-0',
        scopes: [],
      },
      {
        createdAt: 'linked-1',
        id: 'team-member-id-1',
        scopes: [],
      },
    ],
  },
];
