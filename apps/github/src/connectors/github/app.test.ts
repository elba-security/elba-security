import { expect, test, describe, vi } from 'vitest';
import { ZodError } from 'zod';
import { getApp } from './app';
import * as client from './commons/client';

const installationId = 123456;
const appSlug = 'app-slug';

describe('app connector', () => {
  describe('getApp', () => {
    test('should return installation when installation is valid', async () => {
      const app = {
        name: 'foo',
        html_url: 'http://github.com/foo',
        description: null,
        owner: null,
      };
      const octokitRequest = vi.fn().mockResolvedValue({ data: app });

      // @ts-expect-error this is a mock
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        getInstallationOctokit: vi.fn().mockResolvedValue({
          request: octokitRequest,
        }),
      });

      await expect(getApp(installationId, appSlug)).resolves.toStrictEqual(app);

      expect(octokitRequest).toBeCalledTimes(1);
      expect(octokitRequest).toBeCalledWith('GET /apps/{app_slug}', {
        app_slug: appSlug,
      });
    });

    test('should throw when installation is invalid', async () => {
      const app = {
        name: 'foo',
        // html_url should be defined
        html_url: null,
        description: null,
        owner: null,
      };
      const octokitRequest = vi.fn().mockResolvedValue({ data: app });
      // @ts-expect-error this is a mock
      vi.spyOn(client, 'createOctokitApp').mockReturnValue({
        getInstallationOctokit: vi.fn().mockResolvedValue({
          request: octokitRequest,
        }),
      });

      await expect(getApp(installationId, appSlug)).rejects.toBeInstanceOf(ZodError);
      expect(octokitRequest).toBeCalledTimes(1);
      expect(octokitRequest).toBeCalledWith('GET /apps/{app_slug}', {
        app_slug: appSlug,
      });
    });
  });
});
