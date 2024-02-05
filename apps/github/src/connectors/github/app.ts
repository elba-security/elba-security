import { z } from 'zod';
import { createOctokitApp } from './commons/client';

export const AppSchema = z.object({
  name: z.string(),
  html_url: z.string(),
  description: z.string().nullable(),
  owner: z
    .object({
      name: z.string().nullable().optional(),
    })
    .nullable(),
});

export type App = z.infer<typeof AppSchema>;

export const getApp = async (installationId: number, appSlug: string) => {
  const app = createOctokitApp();
  const installationOctokit = await app.getInstallationOctokit(installationId);

  const { data } = await installationOctokit.request('GET /apps/{app_slug}', {
    app_slug: appSlug,
  });

  return AppSchema.parse(data);
};
