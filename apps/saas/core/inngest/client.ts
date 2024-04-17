import type { Combine, StandardEventSchemas } from 'inngest';
import { EventSchemas, Inngest } from 'inngest';
import type { StandardEventSchema } from 'inngest/components/EventSchemas';

type PrefixRecord<T extends Record<string, unknown>, I extends string> = {
  [K in keyof T as `${I}/${K & string}`]: T[K];
};

export type ElbaInngest<Id extends string> = ReturnType<typeof createClient<Id>>;

export const createClient = <Id extends string, ExtraEvents extends StandardEventSchemas = {}>(
  id: Id
) => {
  type ElbaSchemas = PrefixRecord<
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
  const schemas = new EventSchemas().fromGenerated<ElbaSchemas & ExtraEvents>();

  return new Inngest({
    id,
    schemas,
  });
};
