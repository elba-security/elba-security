import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const updateAuthenticationObjectsSchema = z.object({
  objects: z.array(
    z.object({
      userId: z.string().min(1),
      authMethod: z.enum(['mfa', 'password', 'sso']),
    })
  ),
});

export type UpdateAuthenticationObjects = zInfer<typeof updateAuthenticationObjectsSchema>;
