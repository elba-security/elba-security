import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { removeOrganisation } from './remove-organisation';

const region = 'us';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(removeOrganisation, 'jira/app.uninstalled');

describe('remove-organisation', () => {
  test('should remove given organisation', async () => {
    const elba = spyOnElba();

    const [result] = setup({ organisationId, region, errorType: 'unauthorized' });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorType: 'unauthorized',
    });
  });
});
