import { env } from '@/common/env';
import { TypeformConnectionError } from './commons/errors';
import { getWorkspaces, getWorkspaceDetails } from './workspaces';
import { typeformRateLimiter } from './commons/rate-limiter';

export const removeUserFromAllWorkspaces = async ({
  accessToken,
  userEmail,
  isEuDataCenter = false,
}: {
  accessToken: string;
  userEmail: string;
  isEuDataCenter?: boolean;
}) => {
  const baseUrl = isEuDataCenter ? env.TYPEFORM_EU_API_BASE_URL : env.TYPEFORM_API_BASE_URL;
  let page = 1;
  let hasMorePages = true;

  // Iterate through all workspaces
  while (hasMorePages) {
    await typeformRateLimiter.wait();

    const workspacesResponse = await getWorkspaces({
      accessToken,
      page,
      isEuDataCenter,
    });

    // Process each workspace
    for (const workspace of workspacesResponse.items) {
      try {
        await typeformRateLimiter.wait();

        // Get workspace details to check if user is a member
        const workspaceDetails = await getWorkspaceDetails({
          accessToken,
          workspaceId: workspace.id,
          isEuDataCenter,
        });

        // Check if user is a member of this workspace
        const isMember = workspaceDetails.members?.some(
          (member) => member.email.toLowerCase() === userEmail.toLowerCase()
        );

        if (isMember) {
          // Remove user from workspace
          await typeformRateLimiter.wait();

          const url = `${baseUrl}/workspaces/${workspace.id}`;
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([
              {
                op: 'remove',
                path: '/members',
                value: { email: userEmail },
              },
            ]),
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new TypeformConnectionError('unauthorized', 'Invalid access token');
            }
            // Continue with other workspaces on error
            // Failed to remove user from workspace ${workspace.id}: ${response.status}
          }
        }
      } catch (error) {
        // Continue with other workspaces on error
        // Error processing workspace ${workspace.id}
      }
    }

    // Check if there are more pages
    hasMorePages = page < workspacesResponse.page_count;
    page++;
  }
};
