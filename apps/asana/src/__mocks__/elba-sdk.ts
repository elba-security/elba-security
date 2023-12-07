/* eslint-disable @typescript-eslint/no-unsafe-argument -- test conveniency */
/* eslint-disable @typescript-eslint/no-explicit-any -- test conveniency */
// TODO: remove this once we have proper endpoint returns
import * as elbaSdk from '@elba-security/sdk';
import type { MockInstance } from 'vitest';
import { vi } from 'vitest';

type ElbaSpy = {
  constructor: MockInstance;
  connectionStatus: {
    update: MockInstance;
  };
  users: {
    update: MockInstance;
    delete: MockInstance;
  };
};

export const spyOnElbaSdk = () => {
  const spy: ElbaSpy = {
    constructor: vi.fn(),
    connectionStatus: {
      update: vi.fn(),
    },
    users: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const Elba = elbaSdk.Elba;
  spy.constructor = vi.spyOn(elbaSdk, 'Elba').mockImplementation((options: any) => {
    const sdk = new Elba(options);
    spy.connectionStatus.update = vi.spyOn(sdk.connectionStatus, 'update');
    spy.users.update = vi.spyOn(sdk.users, 'update');
    spy.users.delete = vi.spyOn(sdk.users, 'delete');
    return sdk;
  });
  return spy;
};
