import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../chunks/index2.js";
const GET = async () => {
  try {
    const { configService } = getServices();
    return json(configService.getConfig());
  } catch (err) {
    console.error("[api/config] GET error:", err);
    throw error(500, "Failed to get config");
  }
};
const PUT = async ({ request }) => {
  try {
    const { configService } = getServices();
    const updates = await request.json();
    await configService.updateConfig(updates);
    return json(configService.getConfig());
  } catch (err) {
    console.error("[api/config] PUT error:", err);
    throw error(500, "Failed to update config");
  }
};
export {
  GET,
  PUT
};
