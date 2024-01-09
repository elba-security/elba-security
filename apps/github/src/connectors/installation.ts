import { z } from 'zod';
import { createOctokitApp } from './commons/client';

const InstallationSchema = z.object({
  id: z.number(),
  account: z.object({
    type: z.string(),
    login: z.string(),
  }),
  suspended_at: z.string().nullable(),
});

export type Installation = z.infer<typeof InstallationSchema>;

export const getInstallation = async (installationId: number) => {
  const app = createOctokitApp();
  const { data } = await app.octokit.request('GET /app/installations/{installation_id}', {
    installation_id: installationId,
  });
  return InstallationSchema.parse(data);
};
