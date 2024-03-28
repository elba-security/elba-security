import type { GetOrganisationEvents } from './get-organisation';
import type { RemoveOrganisationEvents } from './remove-organisation';
import { removeOrganisation } from './remove-organisation';
import { getOrganisation } from './get-organisation';

export type CommonEvents = GetOrganisationEvents & RemoveOrganisationEvents;

export const commonFunctions = [getOrganisation, removeOrganisation];
