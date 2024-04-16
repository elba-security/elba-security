export type GetTokenResponseData = { access_token: string; token_type: string; scope: string };

export type ClickUpTeam = {
  id: string;
  name: string;
};

export type GetTeamResponseData = {
  teams: ClickUpTeam[];
};

export type UserResponseData = {
  user: {
    id: string;
    email: string;
    username: string;
    role: number;
  };
};

export type GetUsersResponseData = {
  team: {
    members: UserResponseData[];
    roles: {
      id: number;
      name: string;
    }[];
  };
};
export type ClickUpUser = {
  id: string;
  email: string;
  username: string;
  role: string;
};
