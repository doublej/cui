import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../chunks/index2.js";
const GET = async ({ url }) => {
  try {
    const { permissionTracker } = getServices();
    const streamingId = url.searchParams.get("streamingId") || void 0;
    const status = url.searchParams.get("status");
    const permissions = permissionTracker.getPermissionRequests({ streamingId, status });
    return json({ permissions });
  } catch (err) {
    console.error("[api/permissions] GET error:", err);
    throw error(500, "Failed to list permissions");
  }
};
export {
  GET
};
