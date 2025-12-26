import { json, error } from "@sveltejs/kit";
import { g as geminiService } from "../../../../../chunks/gemini-service.js";
import { C as CUIError } from "../../../../../chunks/index3.js";
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.text) {
      throw new CUIError("INVALID_REQUEST", "text is required", 400);
    }
    const result = await geminiService.summarize(body.text);
    return json(result);
  } catch (err) {
    if (err instanceof CUIError) {
      throw error(err.statusCode, err.message);
    }
    console.error("[api/gemini/summarize] POST error:", err);
    throw error(500, "Failed to summarize text");
  }
};
export {
  POST
};
