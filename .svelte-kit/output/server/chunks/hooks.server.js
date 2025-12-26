import { g as getServices, i as initializeServices } from "./index2.js";
let initialized = false;
async function initServices() {
  if (initialized) return;
  try {
    await initializeServices();
    initialized = true;
    console.log("[hooks.server] Services initialized");
  } catch (error) {
    console.error("[hooks.server] Failed to initialize services:", error);
    throw error;
  }
}
const PUBLIC_PATHS = [
  "/api/system/health",
  "/api/permissions",
  "/api/notifications"
];
function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}
const handle = async ({ event, resolve }) => {
  await initServices();
  event.locals.requestId = crypto.randomUUID();
  if (!event.url.pathname.startsWith("/api") || isPublicPath(event.url.pathname)) {
    return resolve(event);
  }
  const authHeader = event.request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  try {
    const { configService } = getServices();
    const config = configService.getConfig();
    if (token !== config.authToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch {
    console.warn("[hooks.server] Config not available for auth check");
  }
  return resolve(event);
};
export {
  handle
};
