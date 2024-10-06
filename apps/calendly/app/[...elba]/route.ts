import { elba } from '@elba-security/next-elba/router';
import { config } from '../../config';

export const runtime = 'edge';

export const { GET, PUT, POST } = elba(config);
