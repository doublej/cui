import { g as getServices } from "../../../../../chunks/index2.js";
const GET = async ({ params }) => {
  const { streamingId } = params;
  const { streamManager } = getServices();
  const stream = streamManager.createStream(streamingId);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive"
    }
  });
};
export {
  GET
};
