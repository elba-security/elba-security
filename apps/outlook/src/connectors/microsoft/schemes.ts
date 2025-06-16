import { z } from 'zod';

export const messageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.object({
    emailAddress: z.object({
      name: z.string(),
      address: z.string(),
    }),
  }),
  toRecipients: z.array(
    z.object({
      emailAddress: z.object({
        name: z.string(),
        address: z.string(),
      }),
    })
  ),
  body: z.object({
    contentType: z.string(),
    content: z.string(),
  }),
});

export const listMessageSchema = z.object({
  id: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string(),
  displayName: z.string().nullable().optional(),
  userType: z.string(),
});
