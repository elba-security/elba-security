import type { BaseElbaOrganisation, Config } from '../../config';
import type { ElbaInngest } from '../client';

export type MakeInngestFunctionParams<T extends BaseElbaOrganisation> = {
  inngest: ElbaInngest;
  config: Config<T>;
};
