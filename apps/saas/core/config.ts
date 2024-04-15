import type { User } from '@elba-security/sdk';
import type { z } from 'zod';

export type BaseElbaOrganisation = {
  id: string;
  region: string;
  createdAt: Date;
};

export type SetOrganisation<Organisation extends BaseElbaOrganisation> = Partial<
  Omit<Organisation, keyof BaseElbaOrganisation>
>;

export type InsertOrganisation<Organisation extends BaseElbaOrganisation> = Omit<
  Organisation,
  keyof BaseElbaOrganisation
>;

export type Config<
  Organisation extends BaseElbaOrganisation,
  AuthSearchParamsSchema extends z.AnyZodObject,
> = {
  id: string;
  sourceId: string;
  elbaRedirectUrl: string;
  database: {
    organisations: {
      getOne: (organisationId: string) => Promise<Organisation | undefined>;
      updateOne: (
        organisationId: string,
        set: Partial<Omit<Organisation, keyof BaseElbaOrganisation>>
      ) => Promise<void>;
      insertOne: (
        organisation: Omit<BaseElbaOrganisation, 'createdAt'> & InsertOrganisation<Organisation>
      ) => Promise<void>;
      getAll: () => Promise<Organisation[]>;
      encryptedKeys: Exclude<keyof Organisation, keyof BaseElbaOrganisation>[];
    };
  };
  routes?: {
    install?: {
      redirectUrl: string;
    };
    auth?: {
      type: 'oauth';
      withState: boolean;
      searchParamsSchema: AuthSearchParamsSchema;
      authenticate: (params: z.infer<AuthSearchParamsSchema>) => Promise<{
        organisation: InsertOrganisation<Organisation>;
        expiresIn?: number;
      }>;
    };
  };
  token?: {
    refreshToken: (organisation: Organisation) => Promise<{
      organisation: SetOrganisation<Organisation>;
      expiresIn: number;
    }>;
  };
  users?: {
    enabled?: boolean;
    getUsers: (
      organisation: Organisation,
      cursor: string | null
    ) => Promise<{
      nextCursor: string | null;
      users: User[];
    }>;
    deleteUser?: (organisation: Organisation, userId: string) => Promise<void>;
  };
  dataProtection?: {
    enabled?: boolean;
  };
  thirdPartyApps?: {
    enabled?: boolean;
  };
};
