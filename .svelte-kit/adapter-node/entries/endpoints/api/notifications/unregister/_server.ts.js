import { error, json } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
const POST = async ({ request }) => {
  try {
    const { webPushService } = getServices();
    await webPushService.initialize();
    const { endpoint } = await request.json();
    if (!endpoint) {
      throw error(400, "endpoint is required");
    }
    webPushService.removeSubscriptionByEndpoint(endpoint);
    return json({ success: true });
  } catch (err) {
    console.error("[api/notifications/unregister] POST error:", err);
    throw error(500, "Failed to unregister subscription");
  }
};
export {
  POST
};
