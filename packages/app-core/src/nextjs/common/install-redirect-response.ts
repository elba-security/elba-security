import type { GetRedirectUrlParams } from '@elba-security/sdk';
import { getRedirectUrl } from '@elba-security/sdk';
import { NextResponse } from 'next/server';

export type ElbaInstallRedirectResponseOptions = Omit<GetRedirectUrlParams, 'region'> & {
  region?: GetRedirectUrlParams['region'] | null;
};

export class ElbaInstallRedirectResponse extends NextResponse {
  constructor({ error, region, baseUrl, sourceId }: ElbaInstallRedirectResponseOptions) {
    if (!region) {
      // todo: implement install error page redirection
      super(JSON.stringify({ error, region }), { status: 500 });
    } else {
      super(null, {
        status: 307,
        headers: {
          Location: getRedirectUrl({
            error,
            region,
            baseUrl,
            sourceId,
          }),
        },
      });
    }
  }
}
