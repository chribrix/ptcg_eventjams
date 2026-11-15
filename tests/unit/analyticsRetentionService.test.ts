import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeRaw } = vi.hoisted(() => ({ executeRaw: vi.fn() }));
vi.mock("~/lib/prisma", () => ({ default: { $executeRaw: executeRaw } }));

import { ANALYTICS_RETENTION_DAYS, deleteExpiredAnalytics } from "~/server/services/analytics/analyticsRetentionService";

describe("analytics retention", () => {
  beforeEach(() => executeRaw.mockReset());

  it("deletes all old rows in bounded batches", async () => {
    executeRaw.mockResolvedValueOnce(5000).mockResolvedValueOnce(3);
    const result = await deleteExpiredAnalytics(new Date("2026-11-06T12:00:00.000Z"));
    expect(ANALYTICS_RETENTION_DAYS).toBe(30);
    expect(result.deleted).toBe(5003);
    expect(result.cutoff).toBe("2026-10-07T12:00:00.000Z");
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});
