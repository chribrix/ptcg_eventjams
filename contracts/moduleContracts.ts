/** JSON-safe contracts shared by local module calls and future transport adapters. */
export type EventRef =
  | { source: "owned"; id: string }
  | { source: "external"; id: string };

export type ActorContext = {
  userId: string;
  requestId?: string;
};

export type TenantContext = {
  actorUserId: string;
  tenantId: string;
  slug: string;
  role: "owner" | "admin" | "staff" | "platform_admin";
};

export type ModuleErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "UNAVAILABLE";

export type LegacyEventReference = {
  customEventId?: string | null;
  externalEventId?: string | null;
};

/** Existing registration rows use two nullable foreign keys; own event wins if both are set. */
export function eventRefFromLegacy(value: LegacyEventReference): EventRef | null {
  if (value.customEventId) return { source: "owned", id: value.customEventId };
  if (value.externalEventId) return { source: "external", id: value.externalEventId };
  return null;
}

export function eventRefKey(value: EventRef): string {
  return `${value.source === "owned" ? "custom" : "external"}:${value.id}`;
}
