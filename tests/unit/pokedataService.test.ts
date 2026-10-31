import { describe, expect, it } from "vitest";
import {
  createPokedataRequest,
  getPokedataGameType,
  mapPokedataEvent,
  parsePokedataResponse,
  fetchPokedataEvents,
} from "~/server/services/events/pokedataService";

describe("pokedataService", () => {
  it("enables TCG and VGC while keeping GO configurable", () => {
    expect(createPokedataRequest()).toMatchObject({
      cups: "1",
      challenges: "1",
      vcups: "1",
      vchallenges: "1",
      go: "0",
      gocup: "0",
    });

    expect(createPokedataRequest({ games: ["go"] })).toMatchObject({
      cups: "0",
      challenges: "0",
      vcups: "0",
      vchallenges: "0",
      go: "1",
      gocup: "1",
    });
  });

  it.each([
    ["League Challenge", "tcg"],
    ["League Challenge VG", "vgc"],
    ["Pokemon VGC Cup", "vgc"],
    ["GO Challenge", "go"],
  ] as const)("maps %s to %s", (type, expectedGameType) => {
    expect(getPokedataGameType(type)).toBe(expectedGameType);
  });

  it("maps a VGC API event into the shared calendar shape", () => {
    expect(
      mapPokedataEvent(
        {
          guid: "vg-event-1",
          when: "2026-09-26 13:30:00",
          type: "League Challenge VG",
          name: "Pokémon VGC Challenge",
          shop: "Test Store",
          city: "Munich",
          country_code: "DE",
          pokemon_url: "https://example.test/event",
          cost: "10",
        },
        0,
      ),
    ).toMatchObject({
      id: "vg-event-1",
      dateTime: "2026-09-26",
      time: "13:30",
      type: "League Challenge VG",
      gameType: "vgc",
      icon: "chall",
      cost: "10€",
    });
  });

  it("passes an empty state filter through and parses Pokedata's warning-prefixed JSON", () => {
    expect(createPokedataRequest({ states: [] }).states).toBe("[]");
    expect(parsePokedataResponse('<br /><b>Warning</b>: test<br />[{"guid":"one"}]')).toEqual([{ guid: "one" }]);
    expect(() => parsePokedataResponse("<html>Unavailable</html>")).toThrow("invalid response");
  });

  it("reads all paginated table results without losing the second page", async () => {
    const pages: number[] = [];
    const fetcher = async (_url: unknown, options: RequestInit = {}) => {
      const request = JSON.parse(String(options.body));
      pages.push(request.page);
      const records = request.page === 0
        ? Array.from({ length: 100 }, (_, index) => ({ guid: `event-${index}`, date: "2026-11-01" }))
        : [{ guid: "event-100", date: "2026-11-02" }];
      return { ok: true, text: async () => JSON.stringify(records) } as Response;
    };
    const events = await fetchPokedataEvents({}, fetcher as typeof fetch);
    expect(pages).toEqual([0, 1]);
    expect(events).toHaveLength(101);
    expect(events[100].id).toBe("event-100");
  });
});
