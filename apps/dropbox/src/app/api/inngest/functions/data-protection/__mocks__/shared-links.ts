import type { sharing } from 'dropbox';

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

type PickedSharedLinkMetadata = Pick<
  sharing.SharedLinkMetadataReference,
  '.tag' | 'id' | 'name' | 'path_lower' | 'url'
>;

type UpdateLinkType = PickedSharedLinkMetadata & {
  link_permissions?: CustomLinkPermissions;
};

export type PickedSharedLinkResponse = {
  result: Omit<sharing.ListSharedLinksResult, 'links'> & {
    links: UpdateLinkType[];
  };
};

export const teamMemberOneFirstPage: PickedSharedLinkResponse = {
  result: {
    links: [
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
    ],
    has_more: true,
    cursor: 'has-more-cursor',
  },
};

export const teamMemberOneSecondPage: PickedSharedLinkResponse = {
  result: {
    links: [
      {
        '.tag': 'folder',
        url: 'https://foo.com/path-3',
        id: 'id:shared-folder-id-3',
        name: 'path-3',
        path_lower: '/path-3',
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
        '.tag': 'folder',
        url: 'https://foo.com/path-4',
        id: 'ns:shared-folder-id-4',
        name: 'shared-folder-path-4',
        path_lower: '/shared-folder-path-4',
        link_permissions: {
          requested_visibility: {
            '.tag': 'team_only',
          },
          effective_audience: {
            '.tag': 'public',
          },
          link_access_level: {
            '.tag': 'editor',
          },
        },
      },
    ],
    has_more: false,
  },
};

export const teamMemberOnceSecondPageWithoutPagination: PickedSharedLinkResponse = {
  result: {
    links: [
      {
        '.tag': 'folder',
        url: 'https://foo.com/path-5',
        id: 'id:shared-folder-id-5',
        name: '/shared-folder-path-5',
        path_lower: '/shared-folder-path-5',
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
        url: 'https://foo.com/shared-file-6.jpg',
        id: 'id:shared-file-id-6',
        name: 'shared-file-6.jpg',
        path_lower: '/shared-file-6.jpg',
        link_permissions: {
          resolved_visibility: {
            '.tag': 'public',
          },
          requested_visibility: {
            '.tag': 'public',
          },
        },
      },
    ],
    has_more: false,
  },
};
