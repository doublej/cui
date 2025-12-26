import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../chunks/index2.js";
const POST = async () => {
  try {
    const { sessionInfoService } = getServices();
    const archivedCount = await sessionInfoService.archiveAllSessions();
    return json({
      success: true,
      archivedCount,
      message: `Successfully archived ${archivedCount} session${archivedCount !== 1 ? "s" : ""}`
    });
  } catch (err) {
    console.error("[api/conversations/archive-all] POST error:", err);
    throw error(500, "Failed to archive sessions");
  }
};
export {
  POST
};
