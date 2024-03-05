import { OpenAiError } from './commons/error';

export const deleteUser = async (token: string, organizationId: string, userId: string) => {
  const response = await fetch(
    `https://api.openai.com/v1/organizations/${organizationId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new OpenAiError(`Could not delete user with Id: ${userId}`, { response });
  }
};
