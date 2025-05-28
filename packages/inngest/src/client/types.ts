import {
  type StandardEventSchemas,
  type EventSchemas,
  type Inngest,
  type InngestFunction,
  type EventPayload,
} from 'inngest';
import {
  type ConnectionType,
  type CredentialsAuthTypes,
  type NangoAPIClient,
} from '@elba-security/nango';
import { type Logger } from 'inngest/middleware/logger';
import { type StandardEventSchema } from 'inngest/components/EventSchemas';
import { type ElbaRegion } from '@elba-security/schemas';
import { type IntegrationEvents, type ElbaOrganisationEvents } from './events';

export type IntegrationEventsUnionToRecord<
  Events extends Record<string, unknown>,
  Name extends string,
> = {
  [K in Events extends unknown ? keyof Events & string : never as `${Name}/${K}`]: {
    name: `${Name}/${K}`;
    data: Events extends Record<K, infer U> ? U : never;
  };
};

export type IntegrationInngestEvents<Name extends string> = IntegrationEventsUnionToRecord<
  IntegrationEvents,
  Name
>;

export type ElbaOrganisationEventsBaseData = {
  sourceId: string;
  organisationId: string;
};

export type ElbaOrganisationInngestEvents = {
  [Event in keyof ElbaOrganisationEvents as `${ElbaRegion}/elba/${Event}`]: {
    name: `${ElbaRegion}/elba/${Event}`;
    data: ElbaOrganisationEvents[Event] & ElbaOrganisationEventsBaseData;
  };
};

export type ElbaInngestInstance<
  Name extends string = string,
  CustomEvents extends Record<string, EventPayload> = Record<never, unknown>,
> = Inngest<{
  id: Name;
  schemas: EventSchemas<
    CustomEvents & IntegrationInngestEvents<Name> & ElbaOrganisationInngestEvents
  >;
  logger: Logger;
}>;

export type ElbaInngestConfig<
  Name extends string = string,
  NangoAuthType extends MaybeNangoAuthType = MaybeNangoAuthType,
> = {
  name: Name;
  sourceId: string;
  nangoClient: NangoAuthType extends null ? null : NangoAPIClient;
  nangoAuthType: NangoAuthType;
  inngest: ElbaInngestInstance<Name>;
};

export type PrefixedIntegrationNameEvents<
  Name extends string,
  Events extends StandardEventSchemas,
> = {
  [Event in keyof Events & string as `${Name}/${Event}`]: {
    data: Events[Event]['data'];
  };
};

export type NamedStandardEvents = {
  name: string;
} & StandardEventSchema;

export type EventsUnionToRecord<Events extends NamedStandardEvents> = {
  [Event in Events['name']]: Extract<Events, { name: Event }>;
};

export type Cursor<T = string> = { cursor?: T | undefined | null };

export type MaybeNangoAuthType = CredentialsAuthTypes | null;

export type NangoConnection<NangoAuthType extends CredentialsAuthTypes> = {
  connection: ConnectionType<NangoAuthType>;
};

export type ElbaFn<NangoAuthType extends MaybeNangoAuthType, Input, Output, CursorType = never> = [
  CursorType,
] extends [never]
  ? NangoAuthType extends CredentialsAuthTypes
    ? (args: Input & NangoConnection<NangoAuthType>) => Promise<Output>
    : (args: Input) => Promise<Output>
  : NangoAuthType extends CredentialsAuthTypes
  ? (
      args: Input & NangoConnection<NangoAuthType> & Cursor<CursorType>
    ) => Promise<Output & Cursor<CursorType>>
  : (args: Input & Cursor<CursorType>) => Promise<Output & Cursor<CursorType>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- can only be any
export type ElbaInngestFn = (config: ElbaInngestConfig, ...args: any[]) => InngestFunction.Any;

export type ElbaInngestFnArgs<Fn extends ElbaInngestFn> = Parameters<Fn> extends [
  ElbaInngestConfig,
  ...infer Args,
]
  ? Args
  : never;

export type CreateElbaFn<Fn extends ElbaInngestFn> = (
  ...args: ElbaInngestFnArgs<Fn>
) => ReturnType<Fn>;
