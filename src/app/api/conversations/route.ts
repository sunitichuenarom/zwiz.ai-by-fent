import { isAuthorized, unauthorized } from "@/lib/auth";
import { listUsers } from "@/lib/store";

export async function GET() {
  if (!(await isAuthorized())) return unauthorized();
  return Response.json(await listUsers());
}
