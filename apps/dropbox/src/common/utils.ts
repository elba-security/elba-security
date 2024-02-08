import { RedirectionError, getRedirectUrl } from '@elba-security/sdk';
import { env } from '@/env';

export const redirectOnError = (code?: RedirectionError) =>
  getRedirectUrl({
    // TODO: pass organisation region
    region: 'eu',
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
    error: code,
  });

export const redirectOnSuccess = () =>
  getRedirectUrl({
    // TODO: pass organisation region
    region: 'eu',
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
