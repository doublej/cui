import { json } from "@sveltejs/kit";
const GET = async () => {
  return json({ status: "ok" });
};
export {
  GET
};
