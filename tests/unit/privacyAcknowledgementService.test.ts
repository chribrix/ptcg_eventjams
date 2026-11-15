// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, upsert, getLegalState } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
  getLegalState: vi.fn(),
}));
vi.mock("~/lib/prisma", () => ({ default: { metaState: { findUnique, upsert } } }));
vi.mock("~/server/services/legal/legalPageService", () => ({ getLegalState }));

import { getActivePrivacyVersion, hasPrivacyAcknowledgement, recordPrivacyAcknowledgement, requireCurrentPrivacyVersion } from "~/server/services/legal/privacyAcknowledgementService";

const publishedState = () => ({
  operatorName: "Betreiber", operatorAddress: "Straße 1", operatorEmail: "mail@example.org", operatorContact: "",
  datenschutz: { published: true, body: "## Hinweise\nInhalt" },
});

describe("privacy acknowledgement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLegalState.mockResolvedValue(publishedState());
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({});
    vi.stubGlobal("createError", (options: object) => Object.assign(new Error("Privacy version required"), options));
  });

  it("has no active version before publication", async () => {
    getLegalState.mockResolvedValue({ ...publishedState(), datenschutz: { published: false, body: "Entwurf" } });
    expect(await getActivePrivacyVersion()).toBeNull();
    expect(await requireCurrentPrivacyVersion(undefined)).toBeNull();
  });

  it("requires the exact published version and changes it with the text", async () => {
    const first = await getActivePrivacyVersion();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    await expect(requireCurrentPrivacyVersion("outdated")).rejects.toMatchObject({ statusCode: 428 });
    expect(await requireCurrentPrivacyVersion(first)).toBe(first);
    getLegalState.mockResolvedValue({ ...publishedState(), datenschutz: { published: true, body: "Neue Fassung" } });
    expect(await getActivePrivacyVersion()).not.toBe(first);
  });

  it("stores version and time under a hashed event-specific key", async () => {
    await recordPrivacyAcknowledgement("tournament", "event-a:player-1", "v1");
    const call = upsert.mock.calls[0][0];
    expect(call.where.id).toMatch(/^privacy_ack_[a-f0-9]{64}$/);
    expect(call.where.id).not.toContain("player-1");
    expect(call.create.value).toMatchObject({ version: "v1", acknowledgedAt: expect.any(String) });
    findUnique.mockResolvedValue({ value: { version: "v1" } });
    expect(await hasPrivacyAcknowledgement("tournament", "event-a:player-1", "v1")).toBe(true);
    expect(await hasPrivacyAcknowledgement("tournament", "event-a:player-1", "v2")).toBe(false);
  });
});
