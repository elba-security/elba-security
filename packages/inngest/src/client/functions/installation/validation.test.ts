import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { Inngest } from 'inngest';
import { IntegrationConnectionError } from '@elba-security/common';
import { createInstallationValidateFn, type ValidateInstallationFn } from './validation';

const setup = (validateInstallationFn: ValidateInstallationFn<null>) =>
  createInngestFunctionMock(
    createInstallationValidateFn(
      {
        name: 'integration',
        inngest: new Inngest({ id: 'integration' }) as never,
        sourceId: 'source-id',
        nangoAuthType: null,
        nangoClient: null,
      },
      validateInstallationFn
    ),
    'integration/installation.validation.requested'
  )({
    nangoConnectionId: 'nango-connection-id',
    organisationId: 'organisation-id',
    region: 'eu',
  });

describe('installation-validation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2025-01-01T00:00:00.000Z') });
  });

  test('Should properly update elba connection status when installation validation succeeds', async () => {
    const validateInstallationFnMock = vi.fn();
    const [result, { step }] = setup(validateInstallationFnMock);

    await expect(result).resolves.toStrictEqual({
      message: 'Organisation integration installation validation succeeded',
    });

    expect(validateInstallationFnMock).toHaveBeenCalledTimes(1);
    expect(validateInstallationFnMock).toHaveBeenCalledWith({
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith('installation-succeeded', [
      {
        data: {
          organisationId: 'organisation-id',
          region: 'eu',
        },
        name: 'integration/organisation.installed',
      },
      {
        data: {
          nangoConnectionId: 'nango-connection-id',
          organisationId: 'organisation-id',
          region: 'eu',
          syncStartedAt: '2025-01-01T00:00:00.000Z',
        },
        name: 'integration/users.sync.requested',
      },
      {
        data: {
          errorType: null,
          organisationId: 'organisation-id',
          sourceId: 'source-id',
        },
        name: 'eu/elba/connection_status.updated',
      },
    ]);
  });

  test('Should properly set elba connection status when installation validation fails due to an unknown reason', async () => {
    const validateInstallationFnMock = vi
      .fn()
      .mockRejectedValue(new Error('Some installation error'));
    const [result, { step }] = setup(validateInstallationFnMock);

    await expect(result).resolves.toStrictEqual({
      errorMetadata: expect.objectContaining({
        message: 'Some installation error',
      }) as unknown,
      errorType: 'unknown',
      message: 'Organisation integration installation validation failed',
    });

    expect(validateInstallationFnMock).toHaveBeenCalledTimes(1);
    expect(validateInstallationFnMock).toHaveBeenCalledWith({
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith('installation-failed', {
      data: {
        errorMetadata: expect.objectContaining({
          message: 'Some installation error',
        }) as unknown,
        errorType: 'unknown',
        organisationId: 'organisation-id',
        sourceId: 'source-id',
      },
      name: 'eu/elba/connection_status.updated',
    });
  });

  test('Should properly set elba connection status when installation validation fails due to a known reason', async () => {
    const validateInstallationFnMock = vi
      .fn()
      .mockRejectedValue(
        new IntegrationConnectionError('User is not admin', { type: 'not_admin' })
      );
    const [result, { step }] = setup(validateInstallationFnMock);

    await expect(result).resolves.toStrictEqual({
      errorMetadata: expect.objectContaining({
        message: 'User is not admin',
        type: 'not_admin',
      }) as unknown,
      errorType: 'not_admin',
      message: 'Organisation integration installation validation failed',
    });

    expect(validateInstallationFnMock).toHaveBeenCalledTimes(1);
    expect(validateInstallationFnMock).toHaveBeenCalledWith({
      nangoConnectionId: 'nango-connection-id',
      organisationId: 'organisation-id',
      region: 'eu',
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(1);
    expect(step.sendEvent).toHaveBeenCalledWith('installation-failed', {
      data: {
        errorMetadata: expect.objectContaining({
          message: 'User is not admin',
          type: 'not_admin',
        }) as unknown,
        errorType: 'not_admin',
        organisationId: 'organisation-id',
        sourceId: 'source-id',
      },
      name: 'eu/elba/connection_status.updated',
    });
  });
});
