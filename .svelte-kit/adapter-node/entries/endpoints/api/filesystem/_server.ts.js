import { json, error } from "@sveltejs/kit";
import { g as getServices } from "../../../../chunks/index2.js";
import { C as CUIError } from "../../../../chunks/index3.js";
function parseBooleanParam(value) {
  if (value === null) return void 0;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return void 0;
}
const GET = async ({ url }) => {
  try {
    const { fileSystemService } = getServices();
    const action = url.searchParams.get("action");
    const path = url.searchParams.get("path");
    if (!path) {
      throw new CUIError("MISSING_PATH", "path query parameter is required", 400);
    }
    if (action === "list") {
      const recursive = parseBooleanParam(url.searchParams.get("recursive")) ?? false;
      const respectGitignore = parseBooleanParam(url.searchParams.get("respectGitignore")) ?? false;
      const result = await fileSystemService.listDirectory(path, recursive, respectGitignore);
      return json(result);
    } else if (action === "read") {
      const result = await fileSystemService.readFile(path);
      return json(result);
    } else {
      throw new CUIError("INVALID_ACTION", 'action must be "list" or "read"', 400);
    }
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/filesystem] GET error:", err);
    throw error(500, "Failed to perform filesystem operation");
  }
};
export {
  GET
};
