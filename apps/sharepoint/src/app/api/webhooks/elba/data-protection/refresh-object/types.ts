import type { z } from 'zod';
import type { baseSchema } from './route';

export type RefreshDataProtectionObjectSchema = z.infer<typeof baseSchema>;
