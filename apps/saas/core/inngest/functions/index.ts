import type { InngestFunction } from 'inngest';
import type { BaseElbaOrganisation } from '../../config';
import type { MakeInngestFunctionParams } from './types';
import { createRefreshToken } from './token/refresh-token';

export const getInngestFunctions = <T extends BaseElbaOrganisation>({
  inngest,
  config,
}: MakeInngestFunctionParams<T>) => {
  const inngestFunctions: InngestFunction.Any[] = [];
  if (config.token) {
    inngestFunctions.push(createRefreshToken({ inngest, config }));
  }
  return inngestFunctions;
};
