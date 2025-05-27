import { type ElbaRegion, type OrganisationsGetResult } from '@elba-security/sdk';
import { type SourceConnectionEmailScanningApp } from '@elba-security/schemas';
import { referenceFunction, type InngestFunctionReference } from 'inngest';

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
    input: {
      sourceId: string;
      organisationId: string;
      detectionMethod: 'email_scanning';
      apps: SourceConnectionEmailScanningApp[];
    };
    output: {
      message: string;
    };
  };
  'connections.deleted': {
    input: {
      sourceId: string;
      detectionMethod: 'email_scanning';
      organisationId: string;
      syncedBefore: string;
    };
    output: {
      message?: string;
    };
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
