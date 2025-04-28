import * as elbaSdk from '@elba-security/sdk';
import { type MockedClass, vi } from 'vitest';

const Elba = elbaSdk.Elba;

type ElbaMock = MockedClass<typeof elbaSdk.Elba>;

export const spyOnElba = () =>
  vi.spyOn(elbaSdk, 'Elba').mockImplementation((options) => {
    const elba = new Elba(options);
    vi.spyOn(elba.dataProtection, 'updateObjects');
    vi.spyOn(elba.dataProtection, 'deleteObjects');
    vi.spyOn(elba.organisations, 'list');
    vi.spyOn(elba.thirdPartyApps, 'updateObjects');
    vi.spyOn(elba.thirdPartyApps, 'deleteObjects');
    vi.spyOn(elba.users, 'update');
    vi.spyOn(elba.users, 'delete');
    vi.spyOn(elba.connectionStatus, 'update');
    return elba;
  }) as Omit<ElbaMock, 'mock'> & {
    mock: Omit<ElbaMock['mock'], 'results'> & {
      results: {
        value: elbaSdk.Elba;
        type: 'return';
      }[];
    };
  };
