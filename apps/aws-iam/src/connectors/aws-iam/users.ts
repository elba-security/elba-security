import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';
import { IntegrationError } from '@elba-security/common';
import { logger } from '@elba-security/logger';
import { getAWSAuthHeader } from './auth';
import type { AWSIAMRequestParams, AWSIAMUser, TagMember, AWSConnection } from './types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
});

 
const awsIAMUserSchema = z.object({
  UserId: z.string(),
  Path: z.string(),
  UserName: z.string(),
  Arn: z.string(),
  CreateDate: z.string(),
  PasswordLastUsed: z.string().optional(),
});

export type GetUsersParams = {
  credentials: AWSConnection;
  marker?: string | null;
};

export type DeleteUserParams = {
  credentials: AWSConnection;
  userName: string;
};

export const getUsers = async ({ credentials, marker }: GetUsersParams) => {
  const requestParams: AWSIAMRequestParams = {
    method: 'GET',
    service: 'iam',
    path: '/',
    params: {
      Action: 'ListUsers',
      Version: '2010-05-08',
      ...(marker ? { Marker: marker } : {}),
    },
  };

  const validUsers: AWSIAMUser[] = [];
  const invalidUsers: unknown[] = [];

  // Sort and construct query string
  const sortedQueryParams = new Map(
    Object.entries(requestParams.params).sort((a, b) => a[0].localeCompare(b[0]))
  );
  const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

  // Get AWS authorization header
  const { authorizationHeader, date } = getAWSAuthHeader(
    credentials,
    requestParams.method,
    requestParams.service,
    requestParams.path,
    querystring
  );

  const response = await fetch(`https://iam.amazonaws.com/?${querystring}`, {
    method: 'GET',
    headers: {
      Host: 'iam.amazonaws.com',
      'x-amz-date': date,
      Authorization: authorizationHeader,
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const xmlResponse = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- XML parser returns unknown type
  const resData = xmlParser.parse(xmlResponse);

  // AWS IAM returns XML-to-JSON converted response
   
  const listUsersResponse = z
    .object({
      ListUsersResponse: z.object({
        ListUsersResult: z.object({
          Users: z.union([
            z.array(z.unknown()),
            z.object({
              member: z.union([z.array(z.unknown()), z.unknown()]),
            }),
          ]),
          IsTruncated: z.boolean(),
          Marker: z.string().optional(),
        }),
      }),
    })
    .parse(resData);

  // Handle the AWS XML response structure - Users can be an array or an object with 'member'
  let users: unknown[] = [];
   
  const usersData = listUsersResponse.ListUsersResponse.ListUsersResult.Users;

  if (Array.isArray(usersData)) {
    users = usersData;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- AWS XML can return object with member
  } else if (typeof usersData === 'object' && usersData !== null && 'member' in usersData) {
     
    const member = usersData.member;
    users = Array.isArray(member) ? member : [member];
  }

  for (const user of users) {
     
    const result = awsIAMUserSchema.safeParse(user);
     
    if (result.success) {
       
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

   
  const nextMarker = listUsersResponse.ListUsersResponse.ListUsersResult.IsTruncated
    ?  
      listUsersResponse.ListUsersResponse.ListUsersResult.Marker
    : null;

  return {
     
    validUsers,
    invalidUsers,
    nextMarker,
  };
};

export const getUserTags = async (
  credentials: AWSConnection,
  userName: string
): Promise<TagMember[]> => {
  const requestParams: AWSIAMRequestParams = {
    method: 'GET',
    service: 'iam',
    path: '/',
    params: {
      Action: 'ListUserTags',
      Version: '2010-05-08',
      UserName: userName,
    },
  };

  const tags: TagMember[] = [];
  let marker: string | undefined;

  do {
    const params = {
      ...requestParams.params,
      ...(marker ? { Marker: marker } : {}),
    };

    // Sort and construct query string
    const sortedQueryParams = new Map(
      Object.entries(params).sort((a, b) => a[0].localeCompare(b[0]))
    );
    const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

    // Get AWS authorization header
    const { authorizationHeader, date } = getAWSAuthHeader(
      credentials,
      requestParams.method,
      requestParams.service,
      requestParams.path,
      querystring
    );

    const response = await fetch(`https://iam.amazonaws.com/?${querystring}`, {
      method: 'GET',
      headers: {
        Host: 'iam.amazonaws.com',
        'x-amz-date': date,
        Authorization: authorizationHeader,
      },
    });

    if (!response.ok) {
      logger.error('Could not retrieve user tags', { userName, response: response.status });
      // Don't fail the entire sync if we can't get tags for one user
      return [];
    }

    const xmlResponse = await response.text();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- XML parser returns unknown type
    const resData = xmlParser.parse(xmlResponse);

     
    const listUserTagsResponse = z
      .object({
        ListUserTagsResponse: z.object({
          ListUserTagsResult: z.object({
            Tags: z
              .union([
                z.array(
                  z.object({
                    Key: z.string(),
                    Value: z.string(),
                  })
                ),
                z.object({
                  member: z.union([
                    z.array(
                      z.object({
                        Key: z.string(),
                        Value: z.string(),
                      })
                    ),
                    z.object({
                      Key: z.string(),
                      Value: z.string(),
                    }),
                  ]),
                }),
              ])
              .optional(),
            IsTruncated: z.boolean(),
            Marker: z.string().optional(),
          }),
        }),
      })
      .safeParse(resData);

     
    if (listUserTagsResponse.success) {
       
      const tagsData = listUserTagsResponse.data.ListUserTagsResponse.ListUserTagsResult.Tags;

      if (tagsData) {
        if (Array.isArray(tagsData)) {
           
          tags.push(...tagsData);
        } else if ('member' in tagsData) {
           
          const member = tagsData.member;
          if (Array.isArray(member)) {
             
            tags.push(...member);
          } else {
             
            tags.push(member);
          }
        }
      }

       
      marker = listUserTagsResponse.data.ListUserTagsResponse.ListUserTagsResult.IsTruncated
        ?  
          listUserTagsResponse.data.ListUserTagsResponse.ListUserTagsResult.Marker
        : undefined;
    } else {
       
      logger.error('Invalid user tags response', { userName, error: listUserTagsResponse.error });
      return [];
    }
  } while (marker);

  return tags;
};

export const deleteUser = async ({ credentials, userName }: DeleteUserParams) => {
  const requestParams: AWSIAMRequestParams = {
    method: 'GET',
    service: 'iam',
    path: '/',
    params: {
      Action: 'DeleteUser',
      UserName: userName,
      Version: '2010-05-08',
    },
  };

  // Sort and construct query string
  const sortedQueryParams = new Map(
    Object.entries(requestParams.params).sort((a, b) => a[0].localeCompare(b[0]))
  );
  const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

  // Get AWS authorization header
  const { authorizationHeader, date } = getAWSAuthHeader(
    credentials,
    requestParams.method,
    requestParams.service,
    requestParams.path,
    querystring
  );

  const response = await fetch(`https://iam.amazonaws.com/?${querystring}`, {
    method: 'GET',
    headers: {
      Host: 'iam.amazonaws.com',
      'x-amz-date': date,
      Authorization: authorizationHeader,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(`Could not delete user: ${userName}`, { response });
  }
};

// AWS IAM doesn't have a "me" endpoint, so we'll validate by calling ListUsers with a limit of 1
export const validateConnection = async (credentials: AWSConnection) => {
  const requestParams: AWSIAMRequestParams = {
    method: 'GET',
    service: 'iam',
    path: '/',
    params: {
      Action: 'ListUsers',
      Version: '2010-05-08',
      MaxItems: '1',
    },
  };

  // Sort and construct query string
  const sortedQueryParams = new Map(
    Object.entries(requestParams.params).sort((a, b) => a[0].localeCompare(b[0]))
  );
  const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

  const { authorizationHeader, date } = getAWSAuthHeader(
    credentials,
    requestParams.method,
    requestParams.service,
    requestParams.path,
    querystring
  );

  const response = await fetch(`https://iam.amazonaws.com/?${querystring}`, {
    method: 'GET',
    headers: {
      Host: 'iam.amazonaws.com',
      'x-amz-date': date,
      Authorization: authorizationHeader,
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Invalid AWS credentials', { response });
  }
};
