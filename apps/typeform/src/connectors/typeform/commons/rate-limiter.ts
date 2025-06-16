import { env } from '@/common/env';

class RateLimiter {
  private lastRequestTime = 0;
  private requestsPerSecond: number;

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minimumInterval = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest < minimumInterval) {
      const waitTime = minimumInterval - timeSinceLastRequest;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, waitTime);
      });
    }

    this.lastRequestTime = Date.now();
  }
}

export const typeformRateLimiter = new RateLimiter(env.TYPEFORM_API_RATE_LIMIT);
