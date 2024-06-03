import { z } from 'zod';

export const appUserMetadataSchema = z.object({
  permissionId: z.string().min(1).optional(),
  oauthGrantIds: z.array(z.string().min(1)).optional(),
});

export type AppUserMetadata = z.infer<typeof appUserMetadataSchema>;
