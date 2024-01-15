import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';

type SetupOrganisationParams = {
  organisationId: string;
  // code: string;
  region: string;
  token: string;
};
type TrelloMember = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  organizationId?: string;
};

type TrelloUsers = {
  id: string;
  memberships: Memberships[];
};

type Memberships = {
  idMember: string;
  memberType: string;
  unconfirmed: boolean;
  deactivated: boolean;
  id: string;
};

type SyncTrelloUsersParams = {
  token: string;
  organisationId: string;
};
type MembersTrelloUsersParams = {
  token: string;
  membersID: { id: string }[];
};
type User = {
  id: string;
  displayName: string;
  additionalEmails?: string[];
  email?: string;
};

type ElbaUpateUsersParams = {
  organisationId?: string;
  sourceId?: string;
  users: User[];
};

type ElbaUpdateUsersResponse = {
  updateUser: ElbaUpdateUser;
};

type ElbaUpdateUser = {
  count: number;
};
export const setupOrganisation = async ({
  organisationId,
  region,
  token,
}: SetupOrganisationParams) => {
  // retrieve token from SaaS API using the given code
  // const token = await getToken(code);

  await db.insert(Organisation).values({ id: organisationId, region, token }).onConflictDoUpdate({
    target: Organisation.id,
    set: {
      token,
    },
  });
};

export const getTrelloUsersIds = async ({ token }: SyncTrelloUsersParams) => {
  const response = await fetch(
    `https://api.trello.com/1/members/me/boards/all?memberships=all&key=${env.TRELLO_API_KEY}&token=${token}`
  );

  if (!response.ok) {
    throw new Error(`Error: ${response.status} - ${response.statusText}`);
  }

  const result = (await response.json()) as TrelloUsers[];

  const elbaUsers: ElbaUpateUsersParams[] = [];
  for (const item of result) {
    const { memberships } = item;
    const elbaObj: ElbaUpateUsersParams = {
      users: [],
    };
    memberships.forEach((el) => {
      if (!el.unconfirmed && !el.deactivated) {
        const member: User = {
          id: el.idMember,
          displayName: el.memberType,
        };
        elbaObj.users.push(member);
      }
    });
    elbaUsers.push(elbaObj);
  }
  const trelloMembersId: { id: string }[] = [];

  elbaUsers.forEach((elbaParams) => {
    elbaParams.users.forEach((user) => {
      const userId: string = user.id;
      trelloMembersId.push({ id: userId });
    });
  });

  return trelloMembersId;
};

export const getTrelloMembers = async ({ token, membersID }: MembersTrelloUsersParams) => {
  try {
    const memberRequests = membersID.map(({ id }) =>
      fetch(
        `https://api.trello.com/1/members/${id}?fields=username,fullName,email&key=${env.TRELLO_API_KEY}&token=${token}`
      ).then(async (response) => {
        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(`Failed to fetch member with ID ${id}. Error: ${errorMessage}`);
        }

        const responseData = (await response.json()) as TrelloMember;

        return {
          ...responseData,
        };
      })
    );

    const trelloMembers: TrelloMember[] = await Promise.all(memberRequests);

    return trelloMembers;
  } catch (error) {
    throw new Error(`${error}`);
  }
};

export const updateElba = async (trelloMembers: TrelloMember[], organizationId: string) => {
  try {
    const results: ElbaUpdateUsersResponse[] = [];

    for await (const user of trelloMembers) {
      const requestData: ElbaUpateUsersParams = {
        organisationId: organizationId,
        sourceId: `${env.ELBA_SOURCE_ID}`,
        users: [
          {
            id: user.id,
            displayName: user.username,
          },
        ],
      };

      const response = await fetch(`${env.ELBA_API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ELBA_API_KEY}`,
        },
        body: JSON.stringify(requestData),
      });

      const responseData = (await response.json()) as ElbaUpdateUsersResponse;
      results.push(responseData);
    }

    return results;
  } catch (error) {
    throw Error(`Failed to update users in Elba.`);
  }
};
