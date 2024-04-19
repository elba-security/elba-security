import type { Config } from '../../config';
import type { CoreElbaInngest } from '../client';

export type MakeInngestFunctionParams<T extends string> = {
  config: Config<T>;
  inngest: CoreElbaInngest<T>;
};
