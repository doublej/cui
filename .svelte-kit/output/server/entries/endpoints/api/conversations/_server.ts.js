import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../chunks/index2.js";
const GET = async ({ url }) => {
  try {
    const { historyReader, conversationStatusManager, toolMetricsService, sessionInfoService } = getServices();
    const query = {
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")) : void 0,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")) : void 0,
      projectPath: url.searchParams.get("projectPath") || void 0,
      archived: url.searchParams.get("showArchived") === "true"
    };
    const result = await historyReader.listConversations(query);
    const conversationsWithStatus = result.conversations.map((conversation) => {
      const status = conversationStatusManager.getConversationStatus(conversation.sessionId);
      const baseConversation = { ...conversation, status };
      const metrics = toolMetricsService.getMetrics(conversation.sessionId);
      if (metrics) {
        baseConversation.toolMetrics = metrics;
      }
      if (status === "ongoing") {
        const streamingId = conversationStatusManager.getStreamingId(conversation.sessionId);
        if (streamingId) {
          return { ...baseConversation, streamingId };
        }
      }
      return baseConversation;
    });
    const existingSessionIds = new Set(conversationsWithStatus.map((c) => c.sessionId));
    const conversationsNotInHistory = conversationStatusManager.getConversationsNotInHistory(existingSessionIds);
    const allConversations = [...conversationsWithStatus, ...conversationsNotInHistory];
    try {
      await sessionInfoService.syncMissingSessions(allConversations.map((c) => c.sessionId));
    } catch {
    }
    return json({
      conversations: allConversations,
      total: result.total + conversationsNotInHistory.length
    });
  } catch (err) {
    console.error("[api/conversations] GET error:", err);
    throw error(500, "Failed to list conversations");
  }
};
export {
  GET
};
