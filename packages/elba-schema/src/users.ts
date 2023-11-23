import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const updateUsersSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().min(1),
      email: z.string().email().optional(),
      displayName: z.string().min(1),
      additionalEmails: z.array(z.string().email()),
    })
  ),
});

export type UpdateUsers = zInfer<typeof updateUsersSchema>;

export const deleteUsersSchema = z.union([
  z.object({
    ids: z.array(z.string().min(1)).optional(),
  }),
  z.object({
    lastSyncedBefore: z.string().datetime().optional(),
  }),
]);

export type DeleteUsers = zInfer<typeof deleteUsersSchema>;
