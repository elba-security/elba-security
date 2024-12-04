import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { baseDeleteRequestSchema, baseWebhookSchema } from './common';

export const updateUsersSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().min(1),
      email: z.string().email().optional(),
      displayName: z.string().min(1),
      additionalEmails: z.array(z.string().email()),
      role: z.string().min(1).optional(),
      authMethod: z.enum(['mfa', 'password', 'sso']).optional(),
      isSuspendable: z.boolean().optional(),
      url: z.string().url().optional(),
    })
  ),
});

export const usersDeleteUsersRequestedWebhookDataSchema = baseWebhookSchema.and(
  z.object({
    ids: z.array(z.string().min(1)),
  })
);

export type UpdateUsers = zInfer<typeof updateUsersSchema>;

export const deleteUsersSchema = baseDeleteRequestSchema;

export type DeleteUsers = zInfer<typeof deleteUsersSchema>;
