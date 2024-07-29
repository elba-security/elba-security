import { AsanaError } from './error';

export const getRetryAfter = (error: unknown) => {
  if (error instanceof AsanaError && error.response?.status === 429) {
    const retryAfter = error.response.headers.get('retry-after') || 60;

    return `${retryAfter}s`;
  }
};
