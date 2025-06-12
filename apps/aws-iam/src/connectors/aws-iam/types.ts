export type AWSIAMRequestParams = {
  method: string;
  service: string;
  path: string;
  params: Record<string, string>;
};

export type ListUsersResponse = {
  '@xmlns': string;
  ListUsersResult: ListUsersResult;
  ResponseMetadata: ResponseMetadata;
};

type ListUsersResult = {
  Users: AWSIAMUser[];
  IsTruncated: boolean;
  Marker?: string;
};

export type AWSIAMUser = {
  UserId: string;
  Path: string;
  UserName: string;
  Arn: string;
  CreateDate: string;
  PasswordLastUsed?: string;
};

export type ListUserTagsResponse = {
  '@xmlns': string;
  ListUserTagsResult: ListUserTagsResult;
  ResponseMetadata: ResponseMetadata;
};

type ListUserTagsResult = {
  IsTruncated: boolean;
  Tags: Tags[];
  Marker?: string;
};

type Tags = {
  member: TagMember[];
};

export type TagMember = {
  Key: string;
  Value: string;
};

type ResponseMetadata = {
  RequestId: string;
};

export type AWSConnection = {
  username: string;
  password: string;
  region: string;
};
