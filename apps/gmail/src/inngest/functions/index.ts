import type { CommonEvents } from './common';
import { commonFunctions } from './common';
import type { UsersEvents } from './users';
import { usersFunctions } from './users';

export const inngestFunctions = [...commonFunctions, ...usersFunctions];

export type InngestEvents = CommonEvents & UsersEvents;
