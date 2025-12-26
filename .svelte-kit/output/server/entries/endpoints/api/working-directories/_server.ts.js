import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../chunks/index2.js";
const GET = async () => {
  try {
    const { workingDirectoriesService } = getServices();
    const result = await workingDirectoriesService.getWorkingDirectories();
    return json(result);
  } catch (err) {
    console.error("[api/working-directories] GET error:", err);
    throw error(500, "Failed to get working directories");
  }
};
export {
  GET
};
