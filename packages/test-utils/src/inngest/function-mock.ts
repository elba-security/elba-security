/* eslint-disable @typescript-eslint/no-explicit-any -- needed for efficient type extraction */
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { StepError, NonRetriableError, RetryAfterError } from 'inngest';
import type { GetEvents, InngestFunction } from 'inngest';

type AnyInngestFunction = InngestFunction.Any;

type ExtractInngestClient<F extends AnyInngestFunction> = F extends InngestFunction<
  any,
  any,
  any,
  infer Client,
  any,
  any
>
  ? Client
  : never;

type ExtractFunctionEventTriggers<F> = F extends InngestFunction<
  any,
  any,
  any,
  any,
  any,
  infer Triggers
>
  ? Triggers[number]['event']
  : never;

type MockSetupReturns<
  F extends AnyInngestFunction,
  EventName extends ExtractFunctionEventTriggers<F> | undefined,
> = [
  unknown,
  {
    event: {
      ts: number;
      data: EventName extends ExtractFunctionEventTriggers<F>
        ? GetEvents<ExtractInngestClient<F>>[EventName & string]['data']
        : never;
    };
    step: {
      run: Mock<unknown[], unknown>;
      sendEvent: Mock<unknown[], unknown>;
      waitForEvent: Mock<unknown[], unknown>;
      sleepUntil: Mock<unknown[], unknown>;
      invoke: Mock<unknown[], unknown>;
    };
  },
];

type MockSetup<
  F extends AnyInngestFunction,
  EventName extends ExtractFunctionEventTriggers<F> | undefined,
> = EventName extends string
  ? // signature for event function
    (
      data: GetEvents<ExtractInngestClient<F>>[EventName & string]['data']
    ) => MockSetupReturns<F, EventName>
  : // signature for cron function
    () => MockSetupReturns<F, EventName>;

const emptyLog = () => void 0;

export const createInngestFunctionMock =
  <
    F extends AnyInngestFunction,
    EventName extends ExtractFunctionEventTriggers<F> | undefined = undefined,
  >(
    func: F,
    eventName?: EventName
  ): MockSetup<F, EventName> =>
  // @ts-expect-error -- this is a mock
  (data?: GetEvents<ExtractInngestClient<F>>[EventName & string]['data']) => {
    const step = {
      run: vi.fn().mockImplementation(async (name: string, stepHandler: () => Promise<unknown>) => {
        try {
          const result = await stepHandler();
          return result;
        } catch (error) {
          if (!(error instanceof NonRetriableError || error instanceof RetryAfterError)) {
            throw new StepError(name, error);
          }

          throw error;
        }
      }),
      sendEvent: vi.fn().mockResolvedValue(undefined),
      waitForEvent: vi.fn().mockResolvedValue(undefined),
      sleepUntil: vi.fn().mockResolvedValue(undefined),
      invoke: vi
        .fn()
        .mockImplementation(
          (name: string, fn: { function: AnyInngestFunction; data: Record<string, unknown> }) => {
            const setup = createInngestFunctionMock(fn.function, name);
            const [result] = setup(fn.data);
            return result;
          }
        ),
    };
    const ts = Date.now();
    const context = {
      event: {
        name: eventName,
        ts,
        data,
      },
      step,
      logger: {
        info: emptyLog,
        warn: emptyLog,
        error: emptyLog,
        debug: emptyLog,
      },
    };
    return [
      // @ts-expect-error -- this is a mock
      func.fn(context) as Promise<unknown>,
      context,
    ] as MockSetupReturns<F, EventName>;
  };
