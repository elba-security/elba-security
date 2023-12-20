import { beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { permissionGrants } from '@/schemas/permission-grant';

beforeEach(async () => {
  await db.delete(permissionGrants);
  await db.delete(organizations);
});
