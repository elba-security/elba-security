import { vi } from 'vitest';
import type { inngest } from '../clients/inngest';

export const mockInngestFunction = (func: ReturnType<typeof inngest.createFunction>, data = {}) => {
  const step = {
    run: vi
      .fn()
      .mockImplementation((name: string, stepHandler: () => Promise<unknown>) => stepHandler()),
    sendEvent: vi.fn().mockResolvedValue(undefined),
    waitForEvent: vi.fn().mockResolvedValue(undefined),
  };

  const context = {
    event: {
      ts: new Date().getTime(),
      data,
    },
    step,
  };

  return {
    // @ts-expect-error -- this is a mock
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- this is a mock
    result: func.fn(context) as Promise<unknown>,
    step,
  } as const;
};
