import { describe, it, expect, beforeAll } from "vitest";

import { fetch, setup, url } from "@nuxt/test-utils/e2e";
await setup({});

describe.skip("validates decklist", () => {
  it("returns 200 for valid decklist", async () => {
    const response = await fetch("/api/tests/test", {
      method: "GET",
    });

    expect(response.status).toBe(200);
  });
});
