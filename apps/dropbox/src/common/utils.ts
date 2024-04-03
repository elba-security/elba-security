import type { RedirectionError } from '@elba-security/sdk';
import { ElbaInstallRedirectResponse } from '@elba-security/nextjs';
import { env } from '@/env';

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
