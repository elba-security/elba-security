import { type User } from '@elba-security/sdk';
import { type Organisation, type TableColumns } from './database/schema';

// eslint-disable-next-line @typescript-eslint/ban-types -- don't care
export type ElbaConfig<T extends TableColumns = {}> = {
  name: string;
  database: {
    organisations: T;
  };
  oauth?: {
    installationUrl: string;
    authorize: (code: string) => Promise<Partial<Organisation<T>> & { expiresIn: number }>;
    refresh?: (
      organisation: Organisation<T>
    ) => Promise<Partial<Organisation<T>> & { expiresIn: number }>;
  };
  users: {
    getUsers: (
      organisation: Organisation<T>,
      cursor: string | null
    ) => Promise<{ nextCursor: string | null; users: User[] }>;
    deleteUser?: (organisation: Organisation<T>, userId: string) => Promise<void>;
  };
};
