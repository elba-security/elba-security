import { z } from 'zod';
import { type SharedLink } from '@/connectors/dropbox/shared-links';

export const filteredSharedLink = z.object({
  id: z.string(),
  url: z.string(),
  linkAccessLevel: z.string(),
  pathLower: z.string(),
});

export type FilteredSharedLink = z.infer<typeof filteredSharedLink>;

export const filterSharedLinks = (sharedLinks: SharedLink[]) => {
  return sharedLinks.reduce((acc: FilteredSharedLink[], link) => {
    const { id, url, link_permissions: linkPermissions, path_lower: pathLower } = link;

    const effectiveAudience =
      linkPermissions.effective_audience?.['.tag'] ??
      linkPermissions.resolved_visibility?.['.tag'] ??
      null;

    if (!id || !effectiveAudience) {
      return acc;
    }

    if (!['password', 'public'].includes(effectiveAudience)) {
      return acc;
    }

    const linkObject = {
      id,
      url,
      linkAccessLevel: linkPermissions.link_access_level?.['.tag'] ?? 'viewer',
      pathLower,
    };

    acc.push(linkObject);
    return acc;
  }, []);
};
