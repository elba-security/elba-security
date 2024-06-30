import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import { z } from 'zod';
import camelcaseKeys from 'camelcase-keys';
import type { LinkedApps } from '../dropbox/apps';
import { linkedAppsSchema } from '../dropbox/apps';

type CamelCaseLinkedApps = {
  teamMemberId: string;
  linkedApiApps: {
    appId: string;
    appName: string;
    linked?: string;
    publisher?: string;
    publisherUrl?: string;
  }[];
}[];

// Dropbox linked apps  properties are in snake_case, therefore we need to convert them to camelCase
// Reassigning the transformed schema to a new variable to avoid mutating the original schema
const linkedAppsSchemaCamelKeys = z.array(linkedAppsSchema).transform((data) => {
  return camelcaseKeys(data, { deep: true });
});

export type LinkedAppsM = z.infer<typeof linkedAppsSchemaCamelKeys>;

export const formatThirdPartyObjects = (apps: LinkedApps[]) => {
  const memberLinkedApps: CamelCaseLinkedApps = linkedAppsSchemaCamelKeys.parse(apps);

  const thirdPartyApps = new Map<string, ThirdPartyAppsObject>();

  for (const { linkedApiApps, teamMemberId } of memberLinkedApps) {
    for (const { appId, appName, linked, publisher, publisherUrl } of linkedApiApps) {
      const thirdPartyApp = thirdPartyApps.get(appId);

      if (thirdPartyApp) {
        thirdPartyApp.users.push({
          id: teamMemberId,
          ...(linked && { createdAt: linked }),
          scopes: [],
        });
      } else {
        thirdPartyApps.set(appId, {
          id: appId,
          name: appName,
          ...(publisher && { publisherName: publisher }),
          ...(publisherUrl && { url: publisherUrl }),
          users: [
            {
              id: teamMemberId,
              ...(linked && { createdAt: linked }),
              scopes: [],
            },
          ],
        });
      }
    }
  }

  return thirdPartyApps;
};
