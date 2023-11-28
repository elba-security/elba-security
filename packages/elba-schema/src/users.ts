import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { baseDeleteRequestSchema } from './common';

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

export const deleteUsersSchema = baseDeleteRequestSchema;

export type DeleteUsers = zInfer<typeof deleteUsersSchema>;
