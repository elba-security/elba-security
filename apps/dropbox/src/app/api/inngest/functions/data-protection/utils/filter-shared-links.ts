import { sharing } from 'dropbox';
import { SharedLinks } from '../types';

export const filterSharedLinks = ({
  sharedLinks,
  organisationId,
  teamMemberId,
}: {
  sharedLinks: sharing.ListSharedLinksResult['links'];
  organisationId: string;
  teamMemberId: string;
}) => {
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

    const linkObject: SharedLinks = {
      url,
      linkAccessLevel: link.link_permissions.link_access_level?.['.tag'] ?? 'viewer',
      pathLower: path_lower!,
      organisationId,
      teamMemberId,
    };

    return [...acc, linkObject];
  }, []);
};
