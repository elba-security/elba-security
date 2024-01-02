import { sharing } from 'dropbox';
import { SharedLinks } from '../types/types';

export const filterSharedLinks = (sharedLinks: sharing.ListSharedLinksResult['links']) => {
  return sharedLinks.reduce((acc: SharedLinks[], link) => {
    const { id, url, link_permissions, path_lower } = link;

    const effectiveAudience =
      link_permissions.effective_audience?.['.tag'] ??
      link_permissions.resolved_visibility?.['.tag'] ??
      null;

    if (!id || !effectiveAudience) {
      return acc;
    }

    if (!['password', 'public'].includes(effectiveAudience)) {
      return acc;
    }

    if (!link?.path_lower) {
      return acc;
    }

    const linkObject = {
      url,
      linkAccessLevel: link.link_permissions.link_access_level?.['.tag'] ?? 'viewer',
      pathLower: path_lower!,
    };

    return [...acc, linkObject];
  }, []);
};
