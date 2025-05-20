import {
  type InngestMiddleware,
  type InngestFunction,
  type MiddlewareRegisterReturn,
} from 'inngest';
import { type MaybePromise } from 'inngest/helpers/types';
import { type ElbaInngestInstance } from '../types';

type ElbaInngestMiddlewareRegisterFn<Name extends string> = (ctx: {
  client: ElbaInngestInstance<Name>;
  fn?: InngestFunction.Any;
}) => MaybePromise<MiddlewareRegisterReturn>;

type ElbaInngestMiddlewareOpts<Name extends string> = {
  name: string;
  init: ElbaInngestMiddlewareRegisterFn<Name>;
};

export type ElbaInngestMiddleware<Name extends string = string> = InngestMiddleware<
  ElbaInngestMiddlewareOpts<Name>
>;

export type CreateElbaInngestMiddlewareFn = <Name extends string>({
  name,
  sourceId,
}: {
  name: Name;
  sourceId: string;
}) => ElbaInngestMiddleware;
