import { createRefreshTokenFunction } from '@elba-security/app-core';
import { env } from '@/common/env';
import { getRefreshedToken } from '@/connectors/confluence/auth';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const refreshToken = createRefreshTokenFunction({
  inngest,
  database: {
    db,
    organisationsTable,
    encryptedKeys: ['accessToken', 'refreshToken'],
    encryptionKey: env.ENCRYPTION_KEY,
  },
  refreshAdvence: 30 * 60,
  failureBackoff: 15 * 60,
  getRefreshedToken,
});
