import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
import { C as CUIError } from "../../../../../chunks/index3.js";
const GET = async ({ params }) => {
  const { sessionId } = params;
  try {
    const { historyReader, conversationStatusManager, toolMetricsService } = getServices();
    try {
      const messages = await historyReader.fetchConversation(sessionId);
      const metadata = await historyReader.getConversationMetadata(sessionId);
      if (!metadata) {
        throw new CUIError("CONVERSATION_NOT_FOUND", "Conversation not found", 404);
      }
      const response = {
        messages,
        summary: metadata.summary,
        projectPath: metadata.projectPath,
        metadata: {
          totalDuration: metadata.totalDuration,
          model: metadata.model
        },
        toolMetrics: toolMetricsService.getMetrics(sessionId)
      };
      return json(response);
    } catch (historyError) {
      if (historyError instanceof CUIError && historyError.code === "CONVERSATION_NOT_FOUND") {
        const activeDetails = conversationStatusManager.getActiveConversationDetails(sessionId);
        if (activeDetails) {
          return json(activeDetails);
        }
      }
      throw historyError;
    }
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/conversations/[sessionId]] GET error:", err);
    throw error(500, "Failed to get conversation details");
  }
};
export {
  GET
};
