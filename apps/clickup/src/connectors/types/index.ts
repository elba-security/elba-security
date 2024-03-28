export type GetTokenResponseData = { access_token: string; token_type: string; scope: string };


export type ClickUpTeam = {
 id: string;
 name: string;
};


export type GetTeamResponseData = {
 teams: ClickUpTeam[];
};


export type ClickUpUser = {
 id: string;
 email: string;
 username: string;
 role:string;
};


export type GetUsersResponseData = {
 teams:{
    members:{
    users: ClickUpUser[];
    }}
};
