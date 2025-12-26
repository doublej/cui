import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../../chunks/index2.js";
import { C as CUIError } from "../../../../../../chunks/index3.js";
const PUT = async ({ params, request }) => {
  const { sessionId } = params;
  try {
    const { historyReader, sessionInfoService } = getServices();
    const updates = await request.json();
    if (!sessionId?.trim()) {
      return json(
        { success: false, sessionId: "", updatedFields: {}, error: "Session ID is required" },
        { status: 400 }
      );
    }
    const { conversations } = await historyReader.listConversations();
    const sessionExists = conversations.some((conv) => conv.sessionId === sessionId);
    if (!sessionExists) {
      return json(
        {
          success: false,
          sessionId,
          updatedFields: {},
          error: "Conversation session not found"
        },
        { status: 404 }
      );
    }
    if (updates.customName !== void 0 && updates.customName.length > 200) {
      return json(
        {
          success: false,
          sessionId,
          updatedFields: {},
          error: "Custom name must be 200 characters or less"
        },
        { status: 400 }
      );
    }
    if (updates.permissionMode !== void 0) {
      const validModes = ["acceptEdits", "bypassPermissions", "default", "plan"];
      if (!validModes.includes(updates.permissionMode)) {
        return json(
          {
            success: false,
            sessionId,
            updatedFields: {},
            error: `Permission mode must be one of: ${validModes.join(", ")}`
          },
          { status: 400 }
        );
      }
    }
    const sessionUpdates = {};
    if (updates.customName !== void 0) sessionUpdates.custom_name = updates.customName.trim();
    if (updates.pinned !== void 0) sessionUpdates.pinned = updates.pinned;
    if (updates.archived !== void 0) sessionUpdates.archived = updates.archived;
    if (updates.continuationSessionId !== void 0)
      sessionUpdates.continuation_session_id = updates.continuationSessionId;
    if (updates.initialCommitHead !== void 0)
      sessionUpdates.initial_commit_head = updates.initialCommitHead;
    if (updates.permissionMode !== void 0)
      sessionUpdates.permission_mode = updates.permissionMode;
    const updatedFields = await sessionInfoService.updateSessionInfo(sessionId, sessionUpdates);
    return json({
      success: true,
      sessionId,
      updatedFields
    });
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/conversations/[sessionId]/update] PUT error:", err);
    throw error(500, "Failed to update session");
  }
};
export {
  PUT
};
