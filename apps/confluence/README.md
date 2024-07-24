## Confluence

Rename `.env.local.example` to `.env.local`.

This file will be used for local development environment.

### Users

Their is no Confluence endpoints to retrieve directly the users of an instance. Users has to be synced from group entity.

#### Sync flow

A batch of groups are retrieved and their users are synced in a dedicated recursive inngest function. For each group, 200 members are synced at once. This means the inngest recursive chain reaction should be very limited.

The database store users `displayName` and `publicName` in order to format elba data protection object.

### Data Protection

#### Limitations

- A maximum of 100 pages restrictions are synced.
- A maximum of 250 permissions per personal space are synced.
- A maximum of 2500 permissions per global space are synced.

#### Sync flow

Each entities (global spaces, personal spaces, pages) are synced one after the others. Technicaly, it could be synced in parallel, but it makes the logic less stable and harder to read / maintains. Hopefully, restrictions and permissions endpoints are generous in terms of limit: the sync should still be fast.

Order:

1. global spaces with permissions
2. personal spaces with permissions
3. pages with restrictions
