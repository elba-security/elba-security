import { z } from 'zod';

export const appUserMetadataSchema = z.object({
  permissionId: z.string().min(1),
});

export type AppUserMetadata = z.infer<typeof appUserMetadataSchema>;
