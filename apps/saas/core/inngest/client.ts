import { EventSchemas, Inngest } from 'inngest';

type PrefixRecord<T extends Record<string, unknown>, I extends string> = {
  [K in keyof T as `${I}/${K & string}`]: T[K];
};

export type ElbaInngest = ReturnType<typeof createClient>;

export const createClient = (id: string) =>
  new Inngest({
    id,
    schemas: new EventSchemas().fromRecord<
      PrefixRecord<
        {
          'users.sync.requested': {
            data: {
              organisationId: string;
              isFirstSync: boolean;
              syncStartedAt: number;
              cursor: string | null;
            };
          };
          'token.refresh.requested': {
            data: {
              organisationId: string;
              expiresAt: number;
            };
          };
        },
        string
      >
    >(),
  });
