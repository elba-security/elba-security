import { type ElbaRegion, type OrganisationsGetResult } from '@elba-security/sdk';
import { referenceFunction, type InngestFunctionReference } from 'inngest';
import { type ElbaOrganisationEvents } from './events';

const regionSuffix = {
  eu: null,
  us: 'us',
} as const satisfies Record<ElbaRegion, string | null>;

type ElbaFunctions = {
  'organisations.list': {
    input: { sourceId: string };
    output: OrganisationsGetResult;
  };
  'connections.updated': {
    input: ElbaOrganisationEvents['connections.updated'];
    output: never;
  };
  'connections.deleted': {
    input: ElbaOrganisationEvents['connections.deleted'];
    output: never;
  };
};

const elbaInngestFunctionIds = {
  'organisations.list': 'listOrganisations',
  'connections.updated': 'updateConnections',
  'connections.deleted': 'deleteConnections',
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
