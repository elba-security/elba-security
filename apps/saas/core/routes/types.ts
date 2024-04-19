import type { NextRequest } from 'next/server';
import type { Config } from '../config';
import type { CoreElbaInngest } from '../inngest/client';

export type CreateElbaRouteHandler = (
  config: Config,
  inngest: CoreElbaInngest
) => (request: NextRequest) => Response | undefined | Promise<Response | undefined>;
