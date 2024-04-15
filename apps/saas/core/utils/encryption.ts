import { decryptText, encryptText } from '@elba-security/utils';
import type { BaseElbaOrganisation, Config, SetOrganisation } from '../config';

export const decryptOrganisation = async <
  T extends BaseElbaOrganisation,
  D extends SetOrganisation<T>,
>(
  organisation: D,
  config: Config<T>
): Promise<D> => {
  const decryptedOrganisation: D = { ...organisation };
  for (const key of config.database.organisations.encryptedKeys) {
    if (key in organisation && typeof organisation[key] === 'string') {
      // @ts-expect-error -- convenience
      // eslint-disable-next-line no-await-in-loop -- convenience
      decryptedOrganisation[key] = await decryptText({ data: organisation[key], key: 'lol' });
    }
  }
  return decryptedOrganisation;
};

export const encryptOrganisation = async <
  T extends BaseElbaOrganisation,
  D extends SetOrganisation<T>,
>(
  organisation: D,
  config: Config<T>
): Promise<D> => {
  const encryptedOrganisation: D = { ...organisation };
  for (const key of config.database.organisations.encryptedKeys) {
    if (key in organisation && typeof organisation[key] === 'string') {
      // @ts-expect-error -- convenience
      // eslint-disable-next-line no-await-in-loop -- convenience
      encryptedOrganisation[key] = await encryptText({ data: organisation[key], key: 'lol' });
    }
  }
  return encryptedOrganisation;
};
