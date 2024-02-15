import { RedirectionError } from '@elba-security/sdk';
import { env } from '@/env';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';

export const redirectOnError = (region?: string | null, code?: RedirectionError) =>
  new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
    error: code,
  });

export const redirectOnSuccess = (region?: string | null) =>
  new ElbaInstallRedirectResponse({
    region,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_REDIRECT_URL,
  });
