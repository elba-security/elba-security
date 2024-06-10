type ClientStateValidate = {
  dbSubscriptions: { tenantId: string; subscriptionClientState: string; subscriptionId: string }[];
  webhookSubscriptions: { subscriptionId: string; clientState: string }[];
};

export function isClientStateValid({
  dbSubscriptions,
  webhookSubscriptions,
}: ClientStateValidate): boolean {
  if (dbSubscriptions.length !== webhookSubscriptions.length) {
    return false;
  }

  for (const dbSub of dbSubscriptions) {
    if (
      dbSub.subscriptionClientState !==
      webhookSubscriptions.find((webhookSub) => webhookSub.subscriptionId === dbSub.subscriptionId)
        ?.clientState
    )
      return false;
  }

  return true;
}
