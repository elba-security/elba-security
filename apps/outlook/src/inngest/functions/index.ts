import { type CommonEvents, commonFunctions } from './common';
import { type UsersEvents, usersFunctions } from './users';
import { type TokenEvents, tokenFunctions } from './tokens';

export const inngestFunctions = [...commonFunctions, ...usersFunctions, ...tokenFunctions];

export type InngestEvents = CommonEvents & UsersEvents & TokenEvents;
