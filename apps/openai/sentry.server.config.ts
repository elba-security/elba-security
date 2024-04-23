// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const environment = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;
if (process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    environment,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.01,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
}
