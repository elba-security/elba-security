import { HerokuError } from '@/connectors/commons/error';


export const fetchTeamId = async (token: string) => {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.heroku+json; version=3',
    };

    const response = await fetch(`https://api.heroku.com/teams`, {
        headers,
    });

    if (!response.ok) {
        throw new HerokuError('Could not retrieve team ID', { response });
    }

    const responseData = await response.json();

    if (!Array.isArray(responseData) || responseData.length === 0) {
        throw new HerokuError('No teams found for the provided token', { response });
    }

    // Extract the ID from the first team object
    const teamId = responseData[0].id;

    return teamId;
};
