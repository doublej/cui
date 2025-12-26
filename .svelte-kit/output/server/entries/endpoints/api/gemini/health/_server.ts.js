import { json, error } from "@sveltejs/kit";
import { g as geminiService } from "../../../../../chunks/gemini-service.js";
const GET = async () => {
  try {
    const result = await geminiService.checkHealth();
    return json(result);
  } catch (err) {
    console.error("[api/gemini/health] GET error:", err);
    throw error(500, "Failed to check Gemini health");
  }
};
export {
  GET
};
