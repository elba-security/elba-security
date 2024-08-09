/* eslint-disable @typescript-eslint/no-explicit-any -- needed for efficient type extraction */
import { StepError, NonRetriableError, RetryAfterError } from 'inngest';
import type { EventPayload, GetEvents, InngestFunction } from 'inngest';
import { type Mock, vi } from 'vitest';

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

export type ExtractFunctionEventTriggers<F> = F extends InngestFunction<
  any,
  any,
  any,
  any,
  any,
  infer Triggers
>
  ? Triggers[number]['event']
  : never;

export type ExtractFunctionEvents<
  F extends AnyInngestFunction,
  E extends ExtractFunctionEventTriggers<F> = ExtractFunctionEventTriggers<F>,
> = GetEvents<ExtractInngestClient<F>, true>[E];

type MockSetupReturns<
  F extends AnyInngestFunction,
  EventName extends ExtractFunctionEventTriggers<F> | undefined,
> = [
  unknown,
  {
    event: {
      ts: number;
      data: EventName extends ExtractFunctionEventTriggers<F>
        ? ExtractFunctionEvents<F, EventName & string>['data']
        : never;
    };
    events: {
      ts: number;
      data: EventName extends ExtractFunctionEventTriggers<F>
        ? ExtractFunctionEvents<F, EventName & string>['data']
        : never;
    }[];
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
  Data extends
    | ExtractFunctionEvents<F, EventName & string>['data']
    | ExtractFunctionEvents<F, EventName & string>[],
  EventName extends ExtractFunctionEventTriggers<F> | undefined,
> = EventName extends string
  ? // signature for event function
    (data: Data) => MockSetupReturns<F, EventName>
  : // signature for cron function
    () => MockSetupReturns<F, EventName>;

const emptyLog = () => void 0;

export const createInngestFunctionMock =
  <
    F extends AnyInngestFunction,
    Data extends
      | ExtractFunctionEvents<F, EventName & string>['data']
      | ExtractFunctionEvents<F, EventName & string>[],
    EventName extends ExtractFunctionEventTriggers<F> | undefined = ExtractFunctionEventTriggers<F>,
  >(
    func: F,
    eventName?: EventName
  ): MockSetup<F, Data, EventName> =>
  // @ts-expect-error -- this is a mock
  (data?: Data) => {
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
      sendEvent: vi
        .fn()
        .mockImplementation(
          async (
            id: string,
            eventPayload: EventPayload | EventPayload[]
          ): Promise<{ ids: string[] }> => {
            return Promise.resolve({
              ids: Array.from(
                { length: Array.isArray(eventPayload) ? eventPayload.length : 1 },
                (_, index) => `${id}-${index + 1}`
              ),
            });
          }
        ),
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
    let event: unknown, events: unknown[];
    if (Array.isArray(data)) {
      event = data[0];
      events = data;
    } else {
      event = { name: eventName, ts, data };
      events = [event];
    }
    const context = {
      event,
      events,
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
