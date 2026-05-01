import type { H3Event } from "h3";
import { verifyAdmin as verifySupabaseAdmin } from "../util/adminAccess";

// Server-side utility function to check if a user is admin
export async function verifyAdmin(event: H3Event) {
  return verifySupabaseAdmin(event);
}

// Middleware function for admin routes
export default defineEventHandler(async (event) => {
  // Only apply to admin API routes (except the check endpoint and error-logs/create)
  if (
    event.node.req.url?.startsWith("/api/admin/") &&
    !event.node.req.url.includes("/api/admin/check") &&
    !event.node.req.url.includes("/api/admin/error-logs/create")
  ) {
    await verifyAdmin(event);
  }
});
