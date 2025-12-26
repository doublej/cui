import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
const POST = async ({ request }) => {
  try {
    const { webPushService } = getServices();
    await webPushService.initialize();
    const { title, message, tag, data } = await request.json();
    const result = await webPushService.broadcast({
      title: title || "CUI Test",
      message: message || "This is a test notification",
      tag: tag || "cui-test",
      data: data || {}
    });
    return json({ success: true, ...result });
  } catch (err) {
    console.error("[api/notifications/test] POST error:", err);
    throw error(500, "Failed to send test notification");
  }
};
export {
  POST
};
