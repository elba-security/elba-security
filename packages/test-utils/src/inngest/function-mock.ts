/* eslint-disable @typescript-eslint/no-explicit-any -- needed for efficient type extraction */
import { vi, type VitestUtils } from 'vitest';
import type { InngestFunction, EventsFromOpts } from 'inngest';
import type { AnyInngestFunction } from 'inngest/components/InngestFunction';

type ExtractEvents<F extends AnyInngestFunction> = EventsFromOpts<ExtractFunctionTOpts<F>>;

type ExtractFunctionTOpts<F extends AnyInngestFunction> = F extends InngestFunction<
  infer TOps,
  any,
  any,
  any
>
  ? TOps
  : never;

type MockSetupReturns<
  F extends AnyInngestFunction,
  EventName extends keyof ExtractEvents<F> | undefined,
> = [
  unknown,
  {
    event: {
      ts: number;
      data: EventName extends undefined ? never : ExtractEvents<F>[EventName & string]['data'];
    };
    step: {
      run: VitestUtils['fn'];
      sendEvent: VitestUtils['fn'];
    };
  },
];

type MockSetup<
  F extends AnyInngestFunction,
  EventName extends keyof ExtractEvents<F> | undefined,
> = EventName extends string
  ? // signature for event function
    (data: ExtractEvents<F>[EventName & string]['data']) => MockSetupReturns<F, EventName>
  : // signature for cron function
    () => MockSetupReturns<F, EventName>;

export const createInngestFunctionMock =
  <F extends AnyInngestFunction, EventName extends keyof ExtractEvents<F> | undefined = undefined>(
    func: F,
    _?: EventName
  ): MockSetup<F, EventName> =>
  // @ts-expect-error -- this is a mock
  (data?: ExtractEvents<F>[EventName & string]['data']) => {
    const step = {
      run: vi
        .fn()
        .mockImplementation((name: string, stepHandler: () => Promise<unknown>) => stepHandler()),
      sendEvent: vi.fn().mockResolvedValue(undefined),
      waitForEvent: vi.fn().mockResolvedValue(undefined),
    };
    const ts = Date.now();
    const context = {
      event: {
        ts,
        data,
      },
      step,
    };
    return [
      // @ts-expect-error -- this is a mock
      func.fn(context) as Promise<unknown>,
      context,
    ] as MockSetupReturns<F, EventName>;
  };
