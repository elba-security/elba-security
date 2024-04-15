import { eq } from 'drizzle-orm';
import { z } from 'zod';
import init from '../core/init';
import { IntegrationError } from '../core/utils/error';
import { db, organisationsTable, type Organisation } from './database';

const searchParamsSchema = z.object({
  code: z.string(),
});

export default init<Organisation, typeof searchParamsSchema>({
  id: 'saas',
  sourceId: 'blablab',
  elbaRedirectUrl: 'https://elba.ninja',
  inngestFunctions: [],
  routes: {
    auth: {
      type: 'oauth',
      withState: true,
      searchParamsSchema,
      authenticate: async ({ code }) => {
        const token: string = await new Promise((resolve) => {
          resolve(`token-${code}`);
        });
        return {
          organisation: { token },
          expiresIn: 3600,
        };
      },
    },
    install: {
      redirectUrl: 'https://foo.bar',
    },
  },
  database: {
    organisations: {
      getOne: async (organisationId) => {
        const [organisation] = await db
          .select()
          .from(organisationsTable)
          .where(eq(organisationsTable.id, organisationId));
        return organisation;
      },
      insertOne: async (organisation) => {
        await db
          .insert(organisationsTable)
          .values(organisation)
          .onConflictDoUpdate({
            target: organisationsTable.id,
            set: {
              token: organisation.token,
            },
          });
      },
      updateOne: async (organisationId, set) => {
        await db
          .update(organisationsTable)
          .set(set)
          .where(eq(organisationsTable.id, organisationId));
      },
      getAll: () => db.select().from(organisationsTable),
      encryptedKeys: ['token'],
    },
  },
  users: {
    getUsers: async (organisation, cursor) => {
      const response = await fetch(`http://foo.bar/users?page=${cursor ?? 0}`);
      if (!response.ok) {
        throw new IntegrationError('Could not retrieve users', { response });
      }
      const data = await response.json();

      return {
        users: data.users,
        nextCursor: data.next,
      };
    },
    deleteUser: () => void 0, // todo
  },
  token: {
    refreshToken: async (organisation) => {
      return {
        expiresIn: 0,
        organisation: {
          token: 'bla',
        },
      };
    },
  },
});
