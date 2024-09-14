import { CalendlyError } from './error';

export const getRetryAfter = (error: unknown) => {
  if (!(error instanceof CalendlyError)) {
    return;
  }

  if (error.response?.status === 429) {
    let retryAfter = 60;
    const retryAfterHeader = error.response.headers.get('x-ratelimit-reset');
    if (retryAfterHeader) {
      retryAfter = parseInt(retryAfterHeader, 10);
    }
    return `${retryAfter}s`;
  }
};
