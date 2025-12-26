import { json } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
const GET = async () => {
  const { webPushService } = getServices();
  await webPushService.initialize();
  return json({
    enabled: webPushService.getEnabled(),
    subscriptionCount: webPushService.getSubscriptionCount(),
    hasPublicKey: !!webPushService.getPublicKey(),
    publicKey: webPushService.getPublicKey() || void 0
  });
};
export {
  GET
};
