import { logger } from '@elba-security/logger';
import { NangoAPIClient } from '@elba-security/nango';
import {
  type Combine,
  type EventPayload,
  Inngest,
  type InngestFunction,
  type StandardEventSchemas,
} from 'inngest';
import { type StandardEventSchema } from 'inngest/components/EventSchemas';
import { serve } from 'inngest/next';
import { createElbaConnectionErrorMiddleware } from './middlewares';
import {
  createElbaUsersSyncFn,
  createElbaUsersDeleteFn,
  createInstallationValidateFn,
} from './functions';
import {
  type PrefixedIntegrationNameEvents,
  type ElbaInngestConfig,
  type ElbaInngestFnArgs,
  type MaybeNangoAuthType,
  type ElbaInngestFn,
  type ElbaInngestInstance,
  type EventsUnionToRecord,
} from './types';
import { createElbaUsersSyncSchedulerFn } from './functions/users/schedule-sync';

export { referenceElbaFunction } from './elba';

export class ElbaInngestClient<
  Name extends string,
  NangoAuthType extends MaybeNangoAuthType,
  CustomEvents extends Record<string, EventPayload> = Record<never, unknown>,
> {
  readonly #name: Name;
  readonly #sourceId: string;
  readonly #nangoClient: NangoAPIClient | null;
  readonly #nangoAuthType: NangoAuthType;
  readonly inngest: ElbaInngestInstance<Name, CustomEvents>;

  get #config() {
    return {
      name: this.#name,
      sourceId: this.#sourceId,
      nangoClient: this.#nangoClient,
      nangoAuthType: this.#nangoAuthType,
      inngest: this.inngest,
    } as const satisfies ElbaInngestConfig;
  }

  constructor({
    name,
    nangoIntegrationId,
    nangoSecretKey,
    nangoAuthType,
    sourceId,
  }:
    | {
        name: Name;
        nangoIntegrationId: null;
        nangoSecretKey: null;
        nangoAuthType: Extract<NangoAuthType, null>;
        sourceId: string;
      }
    | {
        name: Name;
        nangoIntegrationId: string;
        nangoSecretKey: string;
        nangoAuthType: NonNullable<NangoAuthType>;
        sourceId: string;
      }) {
    this.#name = name;
    this.#sourceId = sourceId;
    this.#nangoAuthType = nangoAuthType;
    this.inngest = new Inngest({
      id: this.#name,
      logger,
      middleware: [
        createElbaConnectionErrorMiddleware({ name: this.#name, sourceId: this.#sourceId }),
      ],
    });

    if (nangoIntegrationId) {
      this.#nangoClient = new NangoAPIClient({
        integrationId: nangoIntegrationId,
        secretKey: nangoSecretKey,
      });
    } else {
      this.#nangoClient = null;
    }
  }

  // eslint-disable-next-line -- we have to define the type manually instead of using `this`
  public fromEventsRecord = <NewEvents extends StandardEventSchemas>(): ElbaInngestClient<
    Name,
    NangoAuthType,
    Combine<CustomEvents, PrefixedIntegrationNameEvents<Name, NewEvents>>
  > => {
    return this;
  };

  public fromEventsUnion = <
    NewEvents extends {
      name: string;
    } & StandardEventSchema,
    // eslint-disable-next-line -- we have to define the type manually instead of using `this`
  >(): ElbaInngestClient<
    Name,
    NangoAuthType,
    Combine<CustomEvents, PrefixedIntegrationNameEvents<Name, EventsUnionToRecord<NewEvents>>>
  > => {
    return this;
  };

  private createElbaFn = <Fn extends ElbaInngestFn>(fn: Fn) => {
    return (...args: ElbaInngestFnArgs<Fn>) => fn(this.#config, ...args) as ReturnType<Fn>;
  };

  public createElbaUsersDeleteFn = this.createElbaFn(createElbaUsersDeleteFn<NangoAuthType>);

  public createElbaUsersSyncFn = <CursorType = string>(
    ...args: ElbaInngestFnArgs<typeof createElbaUsersSyncFn<NangoAuthType, CursorType>>
  ) => {
    return this.createElbaFn(createElbaUsersSyncFn<NangoAuthType, CursorType>)(...args);
  };

  public createElbaUsersSyncSchedulerFn = this.createElbaFn(createElbaUsersSyncSchedulerFn);

  public createInstallationValidateFn = this.createElbaFn(
    createInstallationValidateFn<NangoAuthType>
  );

  public serve = (fns: InngestFunction.Any[] = []) =>
    serve({
      client: this.inngest,
      functions: [...new Set([...fns, ...this.inngest.funcs])],
      streaming: 'allow',
    });
}
