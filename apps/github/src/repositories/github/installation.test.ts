import { expect, test, describe, vi } from 'vitest';
import { ZodError } from 'zod';
import { getInstallation } from './installation';
import * as client from './client';

const installationId = 123456;

describe('installation repository', () => {
  describe('getInstallation', () => {
    test('should return installation when installation is valid', async () => {
      const installation = {
        id: installationId,
        account: {
          id: 6789,
          type: 'Organization',
          login: 'foo-bar',
        },
        suspended_at: null,
      };
      const octokitRequest = vi.fn().mockResolvedValue({ data: installation });
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        octokit: {
          // @ts-expect-error this is a mock
          request: octokitRequest,
        },
      });

      await expect(getInstallation(installationId)).resolves.toStrictEqual(installation);
    });

    test('should throw when installation is invalid', async () => {
      const installation = {
        id: installationId,
        account: {
          id: 'some-invalid-id',
          type: 1234,
          login: 12,
        },
      };
      const octokitRequest = vi.fn().mockResolvedValue({ data: installation });
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        octokit: {
          // @ts-expect-error this is a mock
          request: octokitRequest,
        },
      });

      await expect(getInstallation(installationId)).rejects.toBeInstanceOf(ZodError);
    });
  });
});
