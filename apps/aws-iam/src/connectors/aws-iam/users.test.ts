import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationError } from '@elba-security/common';
import type { AWSConnection, AWSIAMUser, TagMember } from './types';
import { getUsers, getUserTags, deleteUser, validateConnection } from './users';

const credentials: AWSConnection = {
  username: 'AKIAIOSFODNN7EXAMPLE',
  password: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};

const validUsers: AWSIAMUser[] = [
  {
    UserId: 'AIDACKCEVSQ6C2EXAMPLE1',
    Path: '/',
    UserName: 'john.doe',
    Arn: 'arn:aws:iam::123456789012:user/john.doe',
    CreateDate: '2023-01-01T00:00:00Z',
    PasswordLastUsed: '2024-01-01T00:00:00Z',
  },
  {
    UserId: 'AIDACKCEVSQ6C2EXAMPLE2',
    Path: '/',
    UserName: 'jane.smith',
    Arn: 'arn:aws:iam::123456789012:user/jane.smith',
    CreateDate: '2023-02-01T00:00:00Z',
  },
];

const userTags: Record<string, TagMember[]> = {
  'john.doe': [
    { Key: 'firstName', Value: 'John' },
    { Key: 'lastName', Value: 'Doe' },
    { Key: 'email', Value: 'john.doe@example.com' },
  ],
  'jane.smith': [
    { Key: 'firstName', Value: 'Jane' },
    { Key: 'lastName', Value: 'Smith' },
    { Key: 'email', Value: 'jane.smith@example.com' },
  ],
};

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');

          if (action !== 'ListUsers') {
            return new Response(undefined, { status: 400 });
          }

          const authHeader = request.headers.get('Authorization');
          if (!authHeader?.startsWith('AWS4-HMAC-SHA256')) {
            return new Response(undefined, { status: 403 });
          }

          const marker = url.searchParams.get('Marker');
          const isTruncated = !marker;
          const user = isTruncated ? validUsers[0] : validUsers[1];

          const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ListUsersResponse>
  <ListUsersResult>
    <Users>
      <member>
        <UserId>${user.UserId}</UserId>
        <Path>${user.Path}</Path>
        <UserName>${user.UserName}</UserName>
        <Arn>${user.Arn}</Arn>
        <CreateDate>${user.CreateDate}</CreateDate>
        ${
          user.PasswordLastUsed
            ? `<PasswordLastUsed>${user.PasswordLastUsed}</PasswordLastUsed>`
            : ''
        }
      </member>
    </Users>
    <IsTruncated>${isTruncated}</IsTruncated>
    ${isTruncated ? '<Marker>next-marker</Marker>' : ''}
  </ListUsersResult>
</ListUsersResponse>`;

          return new Response(xmlResponse, {
            headers: { 'Content-Type': 'text/xml' },
          });
        })
      );
    });

    test('should return users and nextMarker when there is another page', async () => {
      const result = await getUsers({ credentials, marker: null });

      expect(result.validUsers).toHaveLength(1);
      expect(result.validUsers[0]).toEqual(validUsers[0]);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextMarker).toBe('next-marker');
    });

    test('should return users and no nextMarker when on last page', async () => {
      const result = await getUsers({ credentials, marker: 'next-marker' });

      expect(result.validUsers).toHaveLength(1);
      expect(result.validUsers[0]).toEqual(validUsers[1]);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextMarker).toBeNull();
    });

    test('should throw when AWS credentials are invalid', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(getUsers({ credentials, marker: null })).rejects.toBeInstanceOf(
        IntegrationError
      );
    });

    test('should handle invalid users gracefully', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ListUsersResponse>
  <ListUsersResult>
    <Users>
      <member>
        <UserId>AIDACKCEVSQ6C2EXAMPLE3</UserId>
        <InvalidField>invalid</InvalidField>
      </member>
    </Users>
    <IsTruncated>false</IsTruncated>
  </ListUsersResult>
</ListUsersResponse>`;

          return new Response(xmlResponse, {
            headers: { 'Content-Type': 'text/xml' },
          });
        })
      );

      const result = await getUsers({ credentials, marker: null });

      expect(result.validUsers).toHaveLength(0);
      expect(result.invalidUsers).toHaveLength(1);
      expect(result.nextMarker).toBeNull();
    });
  });

  describe('getUserTags', () => {
    beforeEach(() => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');
          const userName = url.searchParams.get('UserName');

          if (action !== 'ListUserTags') {
            return new Response(undefined, { status: 400 });
          }

          const tags = userTags[userName || ''] || [];
          const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ListUserTagsResponse>
  <ListUserTagsResult>
    <Tags>
      ${tags
        .map(
          (tag) => `
      <member>
        <Key>${tag.Key}</Key>
        <Value>${tag.Value}</Value>
      </member>
      `
        )
        .join('')}
    </Tags>
    <IsTruncated>false</IsTruncated>
  </ListUserTagsResult>
</ListUserTagsResponse>`;

          return new Response(xmlResponse, {
            headers: { 'Content-Type': 'text/xml' },
          });
        })
      );
    });

    test('should return user tags', async () => {
      const tags = await getUserTags(credentials, 'john.doe');

      expect(tags).toHaveLength(3);
      expect(tags).toEqual(userTags['john.doe']);
    });

    test('should return empty array when user has no tags', async () => {
      const tags = await getUserTags(credentials, 'unknown.user');

      expect(tags).toHaveLength(0);
    });

    test('should return empty array on error', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 500 });
        })
      );

      const tags = await getUserTags(credentials, 'john.doe');
      expect(tags).toHaveLength(0);
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');
          const userName = url.searchParams.get('UserName');

          // Mock responses for all the cleanup operations
          if (action === 'ListAttachedUserPolicies') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<ListAttachedUserPoliciesResponse>
  <ListAttachedUserPoliciesResult>
    <AttachedPolicies>
      <member>
        <PolicyArn>arn:aws:iam::aws:policy/ReadOnlyAccess</PolicyArn>
        <PolicyName>ReadOnlyAccess</PolicyName>
      </member>
    </AttachedPolicies>
  </ListAttachedUserPoliciesResult>
</ListAttachedUserPoliciesResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          if (action === 'DetachUserPolicy') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<DetachUserPolicyResponse>
  <ResponseMetadata>
    <RequestId>example-id</RequestId>
  </ResponseMetadata>
</DetachUserPolicyResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          if (action === 'ListUserPolicies') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<ListUserPoliciesResponse>
  <ListUserPoliciesResult>
    <PolicyNames/>
  </ListUserPoliciesResult>
</ListUserPoliciesResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          if (action === 'ListGroupsForUser') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<ListGroupsForUserResponse>
  <ListGroupsForUserResult>
    <Groups/>
  </ListGroupsForUserResult>
</ListGroupsForUserResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          if (action === 'ListAccessKeys') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<ListAccessKeysResponse>
  <ListAccessKeysResult>
    <AccessKeyMetadata/>
  </ListAccessKeysResult>
</ListAccessKeysResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          if (action === 'DeleteLoginProfile') {
            // Can return 404 if no login profile exists
            return new Response(undefined, { status: 404 });
          }

          if (action === 'DeleteUser' && userName === 'john.doe') {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<DeleteUserResponse>
  <ResponseMetadata>
    <RequestId>5a7f3e1d-example</RequestId>
  </ResponseMetadata>
</DeleteUserResponse>`, {
              headers: { 'Content-Type': 'text/xml' },
            });
          }

          return new Response(undefined, { status: 400 });
        })
      );

      await expect(deleteUser({ credentials, userName: 'john.doe' })).resolves.not.toThrow();
    });

    test('should not throw when user does not exist', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 404 });
        })
      );

      await expect(deleteUser({ credentials, userName: 'unknown.user' })).resolves.not.toThrow();
    });

    test('should throw on other errors', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(deleteUser({ credentials, userName: 'john.doe' })).rejects.toBeInstanceOf(
        IntegrationError
      );
    });
  });

  describe('validateConnection', () => {
    test('should validate successfully with valid credentials', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', ({ request }) => {
          const url = new URL(request.url);
          const action = url.searchParams.get('Action');

          if (action !== 'ListUsers') {
            return new Response(undefined, { status: 400 });
          }

          const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<ListUsersResponse>
  <ListUsersResult>
    <Users>
      <member>
        <UserId>AIDACKCEVSQ6C2EXAMPLE</UserId>
        <Path>/</Path>
        <UserName>test.user</UserName>
        <Arn>arn:aws:iam::123456789012:user/test.user</Arn>
        <CreateDate>2023-01-01T00:00:00Z</CreateDate>
      </member>
    </Users>
    <IsTruncated>false</IsTruncated>
  </ListUsersResult>
</ListUsersResponse>`;

          return new Response(xmlResponse, {
            headers: { 'Content-Type': 'text/xml' },
          });
        })
      );

      await expect(validateConnection(credentials)).resolves.not.toThrow();
    });

    test('should throw with invalid credentials', async () => {
      server.use(
        http.get('https://iam.amazonaws.com/', () => {
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(validateConnection(credentials)).rejects.toBeInstanceOf(IntegrationError);
    });
  });
});
