import type { sharing } from 'dropbox';
import type { SharedLinks } from '../types';

export const filterSharedLinks = (sharedLinks: sharing.ListSharedLinksResult['links']) => {
  return sharedLinks.reduce((acc: SharedLinks[], link) => {
    const { id, url, link_permissions: linkPermissions, path_lower: pathLower } = link;

    const effectiveAudience =
      linkPermissions.effective_audience?.['.tag'] ??
      linkPermissions.resolved_visibility?.['.tag'] ??
      null;

    if (!id || !effectiveAudience || !pathLower) {
      return acc;
    }

    if (!['password', 'public'].includes(effectiveAudience)) {
      return acc;
    }

    const linkObject = {
      id,
      url,
      linkAccessLevel: link.link_permissions.link_access_level?.['.tag'] ?? 'viewer',
      pathLower,
    };

    acc.push(linkObject);
    return acc;
  }, []);
};
