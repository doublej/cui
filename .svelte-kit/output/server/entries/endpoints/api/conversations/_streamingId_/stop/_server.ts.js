import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../../chunks/index2.js";
const POST = async ({ params }) => {
  const { streamingId } = params;
  try {
    const { agentService } = getServices();
    const success = await agentService.stopConversation(streamingId);
    return json({ success });
  } catch (err) {
    console.error("[api/conversations/[streamingId]/stop] POST error:", err);
    throw error(500, "Failed to stop conversation");
  }
};
export {
  POST
};
