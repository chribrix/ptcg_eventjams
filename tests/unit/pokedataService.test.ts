import { describe, expect, it } from "vitest";
import {
  createPokedataRequest,
  getPokedataGameType,
  mapPokedataEvent,
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
});