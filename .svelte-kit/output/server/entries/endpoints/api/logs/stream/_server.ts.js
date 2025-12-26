import { logStreamBuffer } from "../../../../../chunks/log-stream-buffer.js";
const GET = async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      const logListener = (logLine) => {
        try {
          controller.enqueue(encoder.encode(`data: ${logLine}

`));
        } catch {
        }
      };
      logStreamBuffer.on("log", logListener);
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 3e4);
      controller.cleanup = () => {
        logStreamBuffer.removeListener("log", logListener);
        clearInterval(heartbeat);
      };
    },
    cancel(controller) {
      const ctrl = controller;
      if (ctrl.cleanup) ctrl.cleanup();
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
};
export {
  GET
};
