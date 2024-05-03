import { organisationFunctions } from './organisations';
import { usersFunctions } from './users';

export const inngestFunctions = [...usersFunctions, ...organisationFunctions];
