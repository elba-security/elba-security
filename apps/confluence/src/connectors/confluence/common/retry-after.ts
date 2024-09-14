import { ConfluenceError } from './error';

export const getRetryAfter = (error: unknown) => {
  const retryAfter = error instanceof ConfluenceError && error.response?.headers.get('Retry-After');

  if (!retryAfter) {
    return;
  }

  return `${retryAfter}s`;
};
