import { decryptText, encryptText } from '@elba-security/utils';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { BaseElbaOrganisation, DatabaseEncryptionConfig } from '../config';
import type { organisationsTable } from '../database/client';

export const decryptOrganisation = async (
  organisation: BaseElbaOrganisation,
  config: DatabaseEncryptionConfig | undefined
): Promise<BaseElbaOrganisation> => {
  if (!config) {
    return organisation;
  }
  const decryptedOrganisation: BaseElbaOrganisation = { ...organisation };
  for (const key of config.encryptedKeys) {
    if (key in organisation && typeof organisation[key] === 'string') {
      // eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-unsafe-assignment -- convenience
      decryptedOrganisation[key] = await decryptText({ data: organisation[key], key: config.key });
    }
  }
  return decryptedOrganisation;
};

export const encryptOrganisation = async (
  organisation: PgUpdateSetSource<typeof organisationsTable>,
  config: DatabaseEncryptionConfig | undefined
): Promise<PgUpdateSetSource<typeof organisationsTable>> => {
  if (!config) {
    return organisation;
  }
  const encryptedOrganisation: PgUpdateSetSource<typeof organisationsTable> = { ...organisation };
  for (const key of config.encryptedKeys) {
    if (key in organisation && typeof organisation[key] === 'string') {
      // eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-unsafe-assignment -- convenience
      encryptedOrganisation[key] = await encryptText({ data: organisation[key], key: config.key });
    }
  }
  return encryptedOrganisation;
};
