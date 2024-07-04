import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { type JWTPayload, SignJWT } from 'jose';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/microsoft/auth';
import { decrypt, encrypt } from '@/common/crypto';
import { REQUIRED_TOKEN_ROLES, refreshToken } from './refresh-token';

const createToken = (payload: JWTPayload) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('urn:example:issuer')
    .setAudience('urn:example:audience')
    .setExpirationTime('0h')
    .sign(new Uint8Array());

const token = await createToken({ roles: REQUIRED_TOKEN_ROLES });
const encryptedToken = await encrypt(token);
const newToken = await createToken({ roles: REQUIRED_TOKEN_ROLES });

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: encryptedToken,
  tenantId: 'tenant-id',
  region: 'us',
};
const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(refreshToken, 'microsoft/token.refresh.requested');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should abort refresh when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: newToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.getToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should uninstall organisation when new token does not contains every roles', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: await createToken({ roles: REQUIRED_TOKEN_ROLES.slice(0, 1) }),
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'uninstalled' });

    expect(authConnector.getToken).toBeCalledTimes(1);
    expect(authConnector.getToken).toBeCalledWith(organisation.tenantId);

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 30 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-organisation', {
      name: 'microsoft/app.uninstalled',
      data: {
        organisationId: organisation.id,
      },
    });
  });

  test('should uninstall organisation when new token does not contains roles properties', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: await createToken({ foo: 'bar' }),
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'uninstalled' });

    expect(authConnector.getToken).toBeCalledTimes(1);
    expect(authConnector.getToken).toBeCalledWith(organisation.tenantId);

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 30 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-organisation', {
      name: 'microsoft/app.uninstalled',
      data: {
        organisationId: organisation.id,
      },
    });
  });

  test('should update encrypted token and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: newToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toStrictEqual({ status: 'success' });

    const [updatedOrganisation] = await db
      .select({ token: organisationsTable.token })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    await expect(decrypt(updatedOrganisation?.token ?? '')).resolves.toBe(newToken);

    expect(authConnector.getToken).toBeCalledTimes(1);
    expect(authConnector.getToken).toBeCalledWith(organisation.tenantId);

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 30 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'microsoft/token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
