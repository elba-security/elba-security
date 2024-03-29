import type { GetOrganisationEvents } from './get-organisation';
import type { RemoveOrganisationEvents } from './remove-organisation';
import { removeOrganisation } from './remove-organisation';
import { getOrganisation } from './get-organisation';
import type { OrganisationEvents } from './organisation';

export type CommonEvents = GetOrganisationEvents & OrganisationEvents & RemoveOrganisationEvents;

export const commonFunctions = [getOrganisation, removeOrganisation];
