import type { z } from 'zod';
import type { baseSchema } from './route';

export type DeleteItemPermissionsSchema = z.infer<typeof baseSchema>;
