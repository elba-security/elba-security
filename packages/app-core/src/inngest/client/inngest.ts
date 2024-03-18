import { logger } from '@elba-security/logger';
import type { EventSchemas } from 'inngest';
import { Inngest } from 'inngest';
import type { ClientOptions, EventPayload } from 'inngest/types';
import type { ElbaDatabase, ElbaDatabaseSchema } from '../../drizzle/database';
import type { ElbaEventsRecord } from './events';

export type InjectEventsNamespace<R extends Record<string, EventPayload>, N extends string> = {
  [K in keyof R as `${N}/${K & string}`]: Omit<R[K], 'name'> & {
    name: `${N}/${K & string}`;
  };
};

type WithElbaOptions<TOpts extends ClientOptions> = Omit<TOpts, 'schemas'> & {
  schemas: TOpts['schemas'] extends EventSchemas<infer E>
    ? EventSchemas<E & InjectEventsNamespace<ElbaEventsRecord, TOpts['id']>>
    : EventSchemas<InjectEventsNamespace<ElbaEventsRecord, TOpts['id']>>;
};

export type ElbaInngestClientOptions = ClientOptions & {
  db: ElbaDatabase;
  dbSchema: ElbaDatabaseSchema;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- convenience
export type AnyElbaInngest = ElbaInngest<any>;

export class ElbaInngest<TOpts extends ElbaInngestClientOptions> extends Inngest<
  WithElbaOptions<TOpts>
> {
  public declare id: TOpts['id'];
  public readonly db: ElbaDatabase;
  public readonly dbSchema: ElbaDatabaseSchema;

  constructor({ db, dbSchema, ...options }: TOpts) {
    super({
      ...options,
      logger,
    } as unknown as WithElbaOptions<TOpts>);
    this.dbSchema = dbSchema;
    this.db = db;
  }
}
