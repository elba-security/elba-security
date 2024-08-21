import { type SharedLink } from '../shared-links';

export const mockSharedLinksFirstPage: {
  links: SharedLink[];
  has_more: boolean;
  cursor?: string;
} = {
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
        effective_audience: {
          '.tag': 'public',
        },
        link_access_level: {
          '.tag': 'viewer',
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
        effective_audience: {
          '.tag': 'public',
        },
        link_access_level: {
          '.tag': 'viewer',
        },
      },
    },
  ],
  has_more: true,
  cursor: 'has-more-cursor',
};

export const mockSharedLinksSecondPage: {
  links: SharedLink[];
  has_more: boolean;
  cursor?: string;
} = {
  links: [
    {
      '.tag': 'file',
      url: 'https://foo.com/path-1/share-file-3.yaml',
      id: 'id:shared-file-id-3',
      name: 'share-file-3.yaml',
      path_lower: 'path-1/share-file-3.yaml',
      link_permissions: {
        resolved_visibility: {
          '.tag': 'public',
        },
        effective_audience: {
          '.tag': 'public',
        },
        link_access_level: {
          '.tag': 'viewer',
        },
      },
    },
    {
      '.tag': 'file',
      url: 'https://foo.com/path-2/share-folder-4',
      id: 'id:share-folder-id-4',
      name: 'share-folder-id-4',
      path_lower: 'path-2/share-folder-4',
      link_permissions: {
        resolved_visibility: {
          '.tag': 'public',
        },
        effective_audience: {
          '.tag': 'public',
        },
        link_access_level: {
          '.tag': 'viewer',
        },
      },
    },
  ],
  has_more: false,
};
