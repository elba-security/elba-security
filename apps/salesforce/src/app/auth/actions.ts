'use server';

import { redirect, RedirectType } from 'next/navigation';
import { cookies } from 'next/headers';
import { env } from '@/common/env';
import { setupOrganisation } from './service';

type RequestParams = {
  access_token: string;
  refresh_token: string;
  instance_url: string;
};

type ClientParams = {
  hashString: string;
};

export const create = async ({ hashString }: ClientParams) => {
  const organisationId = cookies().get('organisation_id')?.value;
  const region = cookies().get('region')?.value;

  // Convert the hash fragment into an object with each parameter as a key-value pair
  const { access_token: accessToken, instance_url: instanceUrl }: RequestParams = hashString
    .split('&')
    .reduce((accumulator, current) => {
      const [key, value] = current.split('=');
      if (key && value) accumulator[decodeURIComponent(key)] = decodeURIComponent(value);
      return accumulator;
    }, {}) as RequestParams;

  if (!organisationId || !accessToken || !region || !instanceUrl) {
    return {
      type: 'redirect',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'unauthorized',
    };
  }

  try {
    await setupOrganisation({ accessToken, instanceUrl, organisationId, region });
  } catch (error) {
    return {
      type: 'redirect',
      region,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_REDIRECT_URL,
      error: 'internal_error',
    };
  }
  redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
};
