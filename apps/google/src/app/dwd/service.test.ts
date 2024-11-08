import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as googleAuth from 'google-auth-library';
import * as googleDrives from '@/connectors/google/drives';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { GoogleDriveAccessDenied } from '@/connectors/google/errors';
import { isInstallationCompleted } from './service';

const JWT = googleAuth.JWT;
const mockedDate = '2024-01-01T00:00:00.000Z';

describe('isInstallationCompleted', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should return true when domain wide delegation is completed', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const serviceAccountClientSpy = vi
      .spyOn(googleAuth, 'JWT')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.JWT>) => {
        const googleJWTClient = new JWT(...options);
        vi.spyOn(googleJWTClient, 'authorize').mockResolvedValue();
        return googleJWTClient;
      });
    const checkGoogleDriveAdminAccessSpy = vi
      .spyOn(googleDrives, 'checkGoogleDriveAdminAccess')
      .mockResolvedValue();

    const result = await isInstallationCompleted({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'customer-id',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    expect(result).toStrictEqual(true);

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith({
      email: 'google-service-account-email',
      key: 'google-service-account-private-key',
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.security',
        'https://www.googleapis.com/auth/drive',
      ],
      subject: 'admin@org.local',
    });

    const JWTInstance = serviceAccountClientSpy.mock.results[0]?.value as
      | googleAuth.JWT
      | undefined;

    expect(JWTInstance?.authorize).toBeCalledTimes(1);
    expect(JWTInstance?.authorize).toBeCalledWith();

    expect(checkGoogleDriveAdminAccessSpy).toBeCalledTimes(1);
    expect(checkGoogleDriveAdminAccessSpy).toBeCalledWith({ auth: JWTInstance });

    const insertedOrganisations = await db.query.organisationsTable.findMany();
    expect(insertedOrganisations).toStrictEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
        createdAt: expect.any(Date),
        googleAdminEmail: 'admin@org.local',
        googleCustomerId: 'customer-id',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        data: { organisationId: '00000000-0000-0000-0000-000000000000' },
        name: 'google/common.organisation.inserted',
      },
      {
        data: {
          isFirstSync: true,
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          syncStartedAt: '2024-01-01T00:00:00.000Z',
        },
        name: 'google/users.sync.requested',
      },
    ]);
  });

  it('Should return false when domain wide delegation is not completed', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const serviceAccountClientSpy = vi
      .spyOn(googleAuth, 'JWT')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.JWT>) => {
        const googleJWTClient = new JWT(...options);
        vi.spyOn(googleJWTClient, 'authorize').mockRejectedValue({});
        return googleJWTClient;
      });
    const checkGoogleDriveAdminAccessSpy = vi
      .spyOn(googleDrives, 'checkGoogleDriveAdminAccess')
      .mockResolvedValue();

    const result = await isInstallationCompleted({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'customer-id',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    expect(result).toStrictEqual(false);

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith({
      email: 'google-service-account-email',
      key: 'google-service-account-private-key',
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.security',
        'https://www.googleapis.com/auth/drive',
      ],
      subject: 'admin@org.local',
    });

    const JWTInstance = serviceAccountClientSpy.mock.results[0]?.value as
      | googleAuth.JWT
      | undefined;

    expect(JWTInstance?.authorize).toBeCalledTimes(1);
    expect(JWTInstance?.authorize).toBeCalledWith();

    expect(checkGoogleDriveAdminAccessSpy).toBeCalledTimes(0);

    const insertedOrganisations = await db.query.organisationsTable.findMany();
    expect(insertedOrganisations).toStrictEqual([]);

    expect(send).toBeCalledTimes(0);
  });

  it('Should throw when access to Google Drive is denied', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const serviceAccountClientSpy = vi
      .spyOn(googleAuth, 'JWT')
      .mockImplementation((...options: ConstructorParameters<typeof googleAuth.JWT>) => {
        const googleJWTClient = new JWT(...options);
        vi.spyOn(googleJWTClient, 'authorize').mockResolvedValue();
        return googleJWTClient;
      });
    const unauthorizedError = new GoogleDriveAccessDenied('Access to Google Drive has been denied');
    const checkGoogleDriveAdminAccessSpy = vi
      .spyOn(googleDrives, 'checkGoogleDriveAdminAccess')
      .mockRejectedValue(unauthorizedError);

    const result = isInstallationCompleted({
      googleAdminEmail: 'admin@org.local',
      googleCustomerId: 'customer-id',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    await expect(result).rejects.toThrowError(unauthorizedError);

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith({
      email: 'google-service-account-email',
      key: 'google-service-account-private-key',
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.user.security',
        'https://www.googleapis.com/auth/drive',
      ],
      subject: 'admin@org.local',
    });

    const JWTInstance = serviceAccountClientSpy.mock.results[0]?.value as
      | googleAuth.JWT
      | undefined;

    expect(JWTInstance?.authorize).toBeCalledTimes(1);
    expect(JWTInstance?.authorize).toBeCalledWith();

    expect(checkGoogleDriveAdminAccessSpy).toBeCalledTimes(1);
    expect(checkGoogleDriveAdminAccessSpy).toBeCalledWith({ auth: JWTInstance });

    const insertedOrganisations = await db.query.organisationsTable.findMany();
    expect(insertedOrganisations).toStrictEqual([]);

    expect(send).toBeCalledTimes(0);
  });
});
