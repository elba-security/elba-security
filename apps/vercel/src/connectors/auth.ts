import { VercelError } from './commons/error';


export const validateToken = async (token: string) => {
 const response = await fetch(`https://api.vercel.com/v5/user/tokens`, {
   headers: { Authorization: `Bearer ${token}` },
 });
 if (!response.ok) {
   throw new VercelError('Could not validate token', { response });
 }
};
