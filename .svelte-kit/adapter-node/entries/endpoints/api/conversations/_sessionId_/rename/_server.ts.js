import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../../chunks/index2.js";
import { C as CUIError } from "../../../../../../chunks/index3.js";
const PUT = async ({ params, request }) => {
  const { sessionId } = params;
  try {
    const { historyReader, sessionInfoService } = getServices();
    const body = await request.json();
    const { customName } = body;
    if (!sessionId?.trim()) {
      throw new CUIError("MISSING_SESSION_ID", "sessionId is required", 400);
    }
    if (customName === void 0 || customName === null) {
      throw new CUIError("MISSING_CUSTOM_NAME", "customName is required", 400);
    }
    if (customName.length > 200) {
      throw new CUIError("CUSTOM_NAME_TOO_LONG", "customName must be 200 characters or less", 400);
    }
    const metadata = await historyReader.getConversationMetadata(sessionId);
    if (!metadata) {
      throw new CUIError("CONVERSATION_NOT_FOUND", "Conversation not found", 404);
    }
    await sessionInfoService.updateCustomName(sessionId, customName.trim());
    return json({
      success: true,
      sessionId,
      customName: customName.trim()
    });
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/conversations/[sessionId]/rename] PUT error:", err);
    throw error(500, "Failed to rename session");
  }
};
export {
  PUT
};
