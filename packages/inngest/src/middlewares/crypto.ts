/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- copy paste from inngest */
import { InngestMiddleware, type MiddlewareRegisterReturn } from 'inngest';
import type { MaybePromise } from 'inngest/helpers/types';
import { encryptText, decryptText } from '@elba-security/utils';

/**
 * This file is mostly a copy paste from inngest
 * https://github.com/inngest/inngest-js/blob/850784a79213fa9d2ba7882002f3cf245ec5d13f/packages/middleware-encryption/src/middleware.ts
 *
 * There are few differences:
 * - This middleware supports async encryption as we depend on webcrypto
 * - Steps are not encrypted by default, only desired encryption fields will
 * - ElbaEncryptionService is provided
 * - Rollout keys are not supported yet
 */

/**
 * A marker used to identify encrypted values without having to guess.
 */
const ENCRYPTION_MARKER = '__ENCRYPTED__';
export const DEFAULT_ENCRYPTION_FIELD = 'encrypted';

export type EventEncryptionFieldInput = string | string[] | ((field: string) => boolean) | false;

type CommonEncryptionMiddlewareOptions = {
  /**
   * The top-level fields of the event that will be encrypted. Can be a single
   * field name, an array of field names, a function that returns `true` if
   * a field should be encrypted, or `false` to disable all event encryption.
   *
   * By default, the top-level field named `"encrypted"` will be encrypted (exported as `DEFAULT_ENCRYPTION_FIELD`).
   */
  eventEncryptionField?: EventEncryptionFieldInput;
};

type EncryptionKeyMiddleWareOptions = {
  /**
   * The key used to encrypt and decrypt data.
   */

  key: string; // TODO: rollout keys
};

type EncryptionServiceMiddleWareOptions = {
  /**
   * The encryption service used to encrypt and decrypt data. If not provided,
   * a default encryption service will be used.
   */
  encryptionService: EncryptionService;
};

/**
 * Options used to configure the encryption middleware.
 */
export type EncryptionMiddlewareOptions = CommonEncryptionMiddlewareOptions &
  (EncryptionKeyMiddleWareOptions | EncryptionServiceMiddleWareOptions);

/**
 * Encrypts and decrypts data sent to and from Inngest.
 */
export const encryptionMiddleware = (
  /**
   * Options used to configure the encryption middleware. If a custom
   * `encryptionService` is not provided, the `key` option is required.
   */
  opts: EncryptionMiddlewareOptions
) => {
  const service =
    'encryptionService' in opts ? opts.encryptionService : new ElbaEncryptionService(opts.key);
  const shouldEncryptEvents = Boolean(opts.eventEncryptionField ?? DEFAULT_ENCRYPTION_FIELD);

  const encryptValue = async (value: unknown): Promise<EncryptedValue> => {
    return {
      [ENCRYPTION_MARKER]: true,
      data: await service.encrypt(value),
    };
  };

  // eslint-disable-next-line @typescript-eslint/require-await -- easy fix
  const decryptValue = async (value: unknown): Promise<unknown> => {
    if (isEncryptedValue(value)) {
      return service.decrypt(value.data);
    }

    return value;
  };

  const fieldShouldBeEncrypted = (field: string): boolean => {
    if (typeof opts.eventEncryptionField === 'undefined') {
      return field === DEFAULT_ENCRYPTION_FIELD;
    }

    if (typeof opts.eventEncryptionField === 'function') {
      return opts.eventEncryptionField(field);
    }

    if (Array.isArray(opts.eventEncryptionField)) {
      return opts.eventEncryptionField.includes(field);
    }

    return opts.eventEncryptionField === field;
  };

  const encryptEventData = async (data: Record<string, unknown>): Promise<unknown> => {
    const encryptedData = Object.keys(data).reduce(async (acc, key) => {
      if (fieldShouldBeEncrypted(key)) {
        return { ...(await acc), [key]: await encryptValue(data[key]) };
      }

      return { ...(await acc), [key]: data[key] };
    }, Promise.resolve({}));

    return encryptedData;
  };

  const decryptEventData = async (data: Record<string, unknown>): Promise<unknown> => {
    const decryptedData = Object.keys(data).reduce(async (acc, key) => {
      if (isEncryptedValue(data[key])) {
        return { ...(await acc), [key]: await decryptValue(data[key]) };
      }

      return { ...(await acc), [key]: data[key] };
    }, Promise.resolve({}));

    return decryptedData;
  };

  return new InngestMiddleware({
    name: '@inngest/middleware-encryption',
    init: () => {
      const registration: MiddlewareRegisterReturn = {
        onFunctionRun: () => {
          return {
            transformInput: async ({ ctx, steps }) => {
              const inputTransformer: InputTransformer = {
                steps: await Promise.all(
                  steps.map(async (step) => ({
                    ...step,
                    data: step.data && (await decryptValue(step.data)),
                  }))
                ),
              };

              if (shouldEncryptEvents) {
                inputTransformer.ctx = {
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- copy paste from inngest
                  event: ctx.event && {
                    ...ctx.event,
                    data: ctx.event.data && (await decryptEventData(ctx.event.data)),
                  },
                  events:
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- copy paste from inngest
                    ctx.events &&
                    (await Promise.all(
                      ctx.events.map(async (event) => ({
                        ...event,
                        data: event.data && (await decryptEventData(event.data)),
                      }))
                    )),
                } as {}; // eslint-disable-line @typescript-eslint/ban-types -- copy paste from inngest
              }

              return inputTransformer;
            },
            transformOutput: async (ctx) => {
              if (!ctx.step) {
                return;
              }

              return {
                result: {
                  // @ts-expect-error -- copy paste from inngest
                  data: ctx.result.data && (await encryptEventData(ctx.result.data)),
                },
              };
            },
          };
        },
      };

      if (shouldEncryptEvents) {
        registration.onSendEvent = () => {
          return {
            transformInput: async ({ payloads }) => {
              return {
                payloads: await Promise.all(
                  payloads.map(async (payload) => ({
                    ...payload,
                    data: payload.data && (await encryptEventData(payload.data)),
                  }))
                ),
              };
            },
          };
        };
      }

      return registration;
    },
  });
};

export type EncryptedValue = {
  [ENCRYPTION_MARKER]: true;
  data: string;
};

type InputTransformer = NonNullable<
  Awaited<
    ReturnType<
      NonNullable<
        Awaited<
          ReturnType<NonNullable<MiddlewareRegisterReturn['onFunctionRun']>>
        >['transformInput']
      >
    >
  >
>;

const isEncryptedValue = (value: unknown): value is EncryptedValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    ENCRYPTION_MARKER in value &&
    value[ENCRYPTION_MARKER] === true &&
    'data' in value &&
    typeof value.data === 'string'
  );
};

/**
 * A service that encrypts and decrypts data. You can implement this abstract
 * class to provide your own encryption service, or use the default encryption
 * service provided by this package.
 */
export abstract class EncryptionService {
  public abstract encrypt(value: unknown): MaybePromise<string>;
  public abstract decrypt(value: string): MaybePromise<unknown>;
}

export class ElbaEncryptionService extends EncryptionService {
  private readonly key: string; // TODO: rollout keys

  constructor(key: string) {
    super();

    this.key = key;
  }

  encrypt(value: unknown): Promise<string> {
    return encryptText({ data: JSON.stringify(value), key: this.key });
  }

  async decrypt(data: string): Promise<unknown> {
    return JSON.parse(await decryptText({ data, key: this.key })) as Promise<unknown>;
  }
}
