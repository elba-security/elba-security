import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client.node';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { scheduleUsersSyncs } from './schedule-user-sync';

const setup = createInngestFunctionMock(scheduleUsersSyncs);

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('schedule-users-sync', () => {
    beforeAll(() => {
        vi.setSystemTime(mockedDate);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    test('should not schedule sync when there are no organizations', async () => {
        const [result, { step }] = setup();

        await expect(result).resolves.toStrictEqual({ organisations: [] });

        expect(step.sendEvent).toBeCalledTimes(0);
    });

    test('should schedule sync when there are organizations', async () => {
        // @ts-expect-error -- this is a mock
        vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

        const organisations = [
            {
                id: 'e7f32803-c97c-4887-b2fb-d8128f01c9f4',
                token: 'token-1',
                region: 'us',
            },
            {
                id: '7e85a6d6-e8b8-482a-8adb-1964c9684173',
                token: 'token-2',
                region: 'us',
            }
        ]
        await db.insert(Organisation).values(organisations);

        const [result, { step }] = setup();
        //const expectedOrganizations = organizations.map(org => ({ id: org.id }));
        await expect(result).resolves.toStrictEqual({
            organisations
        });

        expect(step.sendEvent).toBeCalledTimes(1);
        expect(step.sendEvent).toBeCalledWith('sync-organisations-users', [
            {
                data: {
                    organisationId: organisations[0]?.id,
                    isFirstSync: false,
                    syncStartedAt: mockedDate,
                    region: 'us',
                    page: 1,
                },
                name: 'monday/users.page_sync.requested',
            },
            {
                data: {
                    organisationId: organisations[1]?.id,
                    isFirstSync: false,
                    syncStartedAt: mockedDate,
                    region: 'us',
                    page: 1,
                },
                name: 'monday/users.page_sync.requested',
            },
        ]);
    });
});