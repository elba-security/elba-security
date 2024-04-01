export type GetTokenResponseData = { access_token: string; token_type: string; scope: string };

export type ClickUpTeam = {
  id: string;
  name: string;
};

export type GetTeamResponseData = {
  teams: ClickUpTeam[];
};

export type ClickUpUser = {
  user: {
    id: string;
    email: string;
    username: string;
    role: number;
  };
};

export type GetUsersResponseData = {
  team: {
    members: ClickUpUser[];
    roles: {
      id: number;
      name: string;
    }[];
  };
};
