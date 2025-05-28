import {
  type DeleteConnectionsObjects,
  type UpdateConnectionsObjects,
  type DeleteUsers,
  type UpdateUsers,
} from '@elba-security/schemas';
import { type ElbaRegion, type OrganisationsGetResult } from '@elba-security/sdk';
import { referenceFunction, type InngestFunctionReference } from 'inngest';
import { type ElbaOrganisationEventsBaseData } from './types';

const regionSuffix = {
  eu: null,
  us: 'us',
} as const satisfies Record<ElbaRegion, string | null>;

type ElbaFunctions = {
  'connections.delete': {
    input: ElbaOrganisationEventsBaseData & DeleteConnectionsObjects;
    output: never;
  };
  'connections.update': {
    input: ElbaOrganisationEventsBaseData & UpdateConnectionsObjects;
    output: never;
  };
  'organisations.list': {
    input: { sourceId: string };
    output: OrganisationsGetResult;
  };
  'users.delete': {
    input: ElbaOrganisationEventsBaseData & DeleteUsers;
    output: never;
  };
  'users.update': {
    input: ElbaOrganisationEventsBaseData & UpdateUsers;
    output: never;
  };
};

const elbaInngestFunctionIds = {
  'connections.delete': 'deleteConnections',
  'connections.update': 'updateConnections',
  'organisations.list': 'listOrganisations',
  'users.delete': 'deleteUsers',
  'users.update': 'updateUsers',
} as const satisfies Record<keyof ElbaFunctions, string>;

export const referenceElbaFunction = <T extends keyof ElbaFunctions>(
  region: ElbaRegion,
  fn: T
): InngestFunctionReference.HelperReturn<
  InngestFunctionReference.HelperArgs<ElbaFunctions[T]['input'], ElbaFunctions[T]['output']>
> => {
  const suffix = regionSuffix[region];
  return referenceFunction({
    appId: `elba-api${suffix ? `-${suffix}` : ''}`,
    functionId: `${region}/elba/${elbaInngestFunctionIds[fn]}`,
  });
};
