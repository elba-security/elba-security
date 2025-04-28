import { type ElbaRegion, type OrganisationsGetResult } from '@elba-security/sdk';
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
};

const elbaInngestFunctionIds = {
  'organisations.list': 'listOrganisations',
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
