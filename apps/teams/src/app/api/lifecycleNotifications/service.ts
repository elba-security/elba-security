import { z } from 'zod';
import { inngest } from '@/inngest/client';

const subscribeSchema = z.object({
  subscriptionId: z.string(),
  lifecycleEvent: z.enum(['reauthorizationRequired', 'subscriptionRemoved']),
  resource: z.string(),
  organizationId: z.string(),
  subscriptionExpirationDateTime: z.string(),
});

export type MicrosoftSubscribeEvent = z.infer<typeof subscribeSchema>;

export type LifecycleEventResponse = {
  value: MicrosoftSubscribeEvent[];
};

export const handleSubscribeEvent = async (data: LifecycleEventResponse) => {
  const subscribeToUpdate: MicrosoftSubscribeEvent[] = [];

  for (const subscribe of data.value) {
    const result = subscribeSchema.safeParse(subscribe);

    if (result.success) {
      if (result.data.lifecycleEvent === 'reauthorizationRequired') {
        subscribeToUpdate.push(result.data);
      }
    }
  }

  if (subscribeToUpdate.length) {
    await inngest.send(
      subscribeToUpdate.map((subscribe) => ({
        id: `subscribe-event-${subscribe.subscriptionId}`,
        name: 'teams/subscribe.refresh.triggered',
        data: {
          organisationId: subscribe.organizationId,
          subscriptionId: subscribe.subscriptionId,
        },
      }))
    );
  }
};
