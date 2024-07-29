import { BoxError } from './error';

export const getRetryAfter = (error: unknown) => {
  if (!(error instanceof BoxError)) {
    return;
  }

  if (error.response?.status === 429 && error.response.headers.get('retry-after')) {
    const retryAfter = error.response.headers.get('retry-after') || 60;

    return `${retryAfter}s`;
  }
};
