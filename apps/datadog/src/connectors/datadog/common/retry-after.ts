import { DatadogError } from './error';

export const getRetryAfter = (error: unknown) => {
  if (!(error instanceof DatadogError)) {
    return;
  }

  if (error.response?.status === 429) {
    const retryAfter = error.response.headers.get('retry-after') || 60;

    return `${retryAfter}s`;
  }
};
