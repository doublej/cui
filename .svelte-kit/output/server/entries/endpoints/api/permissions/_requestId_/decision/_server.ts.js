import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../../../chunks/index2.js";
import { C as CUIError } from "../../../../../../chunks/index3.js";
const POST = async ({ params, request }) => {
  const { requestId } = params;
  try {
    const { permissionTracker } = getServices();
    const body = await request.json();
    if (!body.action || !["approve", "deny"].includes(body.action)) {
      throw new CUIError("INVALID_ACTION", 'Action must be either "approve" or "deny"', 400);
    }
    const permissions = permissionTracker.getPermissionRequests({ status: "pending" });
    const permission = permissions.find((p) => p.id === requestId);
    if (!permission) {
      throw new CUIError("PERMISSION_NOT_FOUND", "Permission request not found or not pending", 404);
    }
    let updated;
    if (body.action === "approve") {
      updated = permissionTracker.updatePermissionStatus(requestId, "approved", {
        modifiedInput: body.modifiedInput
      });
    } else {
      updated = permissionTracker.updatePermissionStatus(requestId, "denied", {
        denyReason: body.denyReason
      });
    }
    if (!updated) {
      throw new CUIError("UPDATE_FAILED", "Failed to update permission status", 500);
    }
    return json({
      success: true,
      message: `Permission ${body.action === "approve" ? "approved" : "denied"} successfully`
    });
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/permissions/[requestId]/decision] POST error:", err);
    throw error(500, "Failed to process permission decision");
  }
};
export {
  POST
};
