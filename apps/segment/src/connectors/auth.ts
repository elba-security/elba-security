import { SegmentError } from './commons/error';

export const validateToken = async (token: string) => {
  const response = await fetch(`https://api.segmentapis.com/echo?message=valid`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new SegmentError('Could not validate token', { response });
  }
};
