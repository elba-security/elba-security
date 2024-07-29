import { AircallError } from './error';

export const getRetryAfter = (error: unknown) => {
  if (!(error instanceof AircallError)) {
    return;
  }

  const resetHeader = error.response?.headers.get('x-aircallapi-reset'); // it is timestamp in milliseconds

  let retryAfter: string | number | Date = 60;

  if (resetHeader) {
    const resetAt = parseInt(resetHeader, 10);
    const now = Date.now();

    const waitFor = resetAt - now;
    retryAfter = Math.ceil(waitFor / 1000);

    if (retryAfter < 0) {
      retryAfter = 60; // Default to 60 seconds
    }

    return `${retryAfter}s`;
  }
};
