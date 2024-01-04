import type { sharing } from 'dropbox/types/dropbox_types';

type PickedSharedLinkMetadata = Pick<
  sharing.SharedLinkMetadataReference,
  '.tag' | 'id' | 'name' | 'path_lower' | 'url'
>;

type CustomLinkPermissions = {
  resolved_visibility?: {
    '.tag': sharing.ResolvedVisibility['.tag'];
  };
  requested_visibility?: {
    '.tag': sharing.RequestedVisibility['.tag'];
  };
  effective_audience?: {
    '.tag': sharing.LinkAudience['.tag'];
  };
  link_access_level?: {
    '.tag': sharing.LinkAccessLevel['.tag'];
  };
};

type SimplifiedTeamMemberInfo = PickedSharedLinkMetadata & {
  link_permissions: CustomLinkPermissions;
};

export const teamMemberOneFirstPage: SimplifiedTeamMemberInfo[] = [
  {
    '.tag': 'file',
    url: 'https://foo.com/path-1/share-file-1.yaml',
    id: 'id:shared-file-id-1',
    name: 'share-file-1.yaml',
    path_lower: 'path-1/share-file-1.yaml',
    link_permissions: {
      resolved_visibility: {
        '.tag': 'public',
      },
      requested_visibility: {
        '.tag': 'public',
      },
    },
  },
  {
    '.tag': 'file',
    url: 'https://foo.com/path-2/share-file-2.epub',
    id: 'id:share-file-id-2',
    name: 'share-file-2.epub',
    path_lower: 'path-2/share-file-2.epub',
    link_permissions: {
      resolved_visibility: {
        '.tag': 'public',
      },
      requested_visibility: {
        '.tag': 'public',
      },
    },
  },
];

export const sharedLinksDbxResponseWithoutPagination: {
  result: {
    links: SimplifiedTeamMemberInfo[];
    cursor: string;
    has_more: boolean;
  };
} = {
  result: {
    links: teamMemberOneFirstPage,
    cursor: 'team-member-second-page-cursor',
    has_more: false,
  },
};

// fetchSharedLinks mock response
export const fetchSharedLinksMockResponse = {
  cursor: 'team-member-second-page-cursor',
  hasMore: false,
  links: [
    {
      linkAccessLevel: 'viewer',
      pathLower: 'path-1/share-file-1.yaml',
      url: 'https://foo.com/path-1/share-file-1.yaml',
    },
    {
      linkAccessLevel: 'viewer',
      pathLower: 'path-2/share-file-2.epub',
      url: 'https://foo.com/path-2/share-file-2.epub',
    },
  ],
};
