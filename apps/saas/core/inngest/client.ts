import type { StandardEventSchemas } from 'inngest';
import { EventSchemas, Inngest } from 'inngest';

type PrefixRecord<T extends Record<string, unknown>, I extends string> = {
  [K in keyof T as `${I}/${K & string}`]: T[K];
};

export type ElbaInngest<Id extends string> = ReturnType<typeof createInngest<Id>>;

type ElbaSchemas<Id extends string> = PrefixRecord<
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
  Id
>;

const coreElbaEventSchemas = new EventSchemas().fromGenerated<ElbaSchemas<string>>();

export type CoreElbaEventSchemas = typeof coreElbaEventSchemas;

export type CoreElbaInngest<Id extends string = string> = Inngest<{
  id: Id;
  schemas: CoreElbaEventSchemas;
}>;

// eslint-disable-next-line @typescript-eslint/ban-types -- convenience
export const createInngest = <Id extends string, ExtraEvents extends StandardEventSchemas = {}>(
  id: Id
) => {
  const schemas = new EventSchemas().fromGenerated<ElbaSchemas<Id> & ExtraEvents>();

  return new Inngest({
    id,
    schemas,
  });
};
