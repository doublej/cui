import { error, json } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
const POST = async ({ request }) => {
  try {
    const { webPushService } = getServices();
    await webPushService.initialize();
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      throw error(400, "Invalid subscription");
    }
    const userAgent = request.headers.get("user-agent") || "";
    webPushService.addOrUpdateSubscription(subscription, userAgent);
    return json({ success: true });
  } catch (err) {
    console.error("[api/notifications/register] POST error:", err);
    throw error(500, "Failed to register subscription");
  }
};
export {
  POST
};
