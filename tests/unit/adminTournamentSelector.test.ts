import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import AdminTournamentSelector from "~/components/AdminTournamentSelector.vue";

const events = [
  { id: "a", name: "Herbst-Cup", venue: "Landshut", eventDate: "2026-10-31T12:00:00Z", ended: false },
  { id: "b", name: "Prerelease", venue: "München", eventDate: "2026-10-24T12:00:00Z", ended: true },
];

describe("admin tournament selector", () => {
  it("groups managed tournaments, filters them and emits the selected ID", async () => {
    const wrapper = await mountSuspended(AdminTournamentSelector, {
      props: { events, selectedEventId: "a", search: "" },
    });
    expect(wrapper.text()).toContain("Laufende Turniere (1)");
    expect(wrapper.text()).toContain("Beendete Turniere (1)");
    await wrapper.findAll(".tm-event-choice")[1]!.trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["b"]);
    await wrapper.setProps({ search: "München" });
    expect(wrapper.text()).toContain("Laufende Turniere (0)");
    expect(wrapper.findAll(".tm-event-choice")).toHaveLength(1);
  });
});
