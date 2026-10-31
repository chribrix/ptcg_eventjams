import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { createI18n } from "vue-i18n";
import AdminEventManagementCard from "~/components/AdminEventManagementCard.vue";

const event = {
  id: "event-1", name: "Prerelease", venue: "Landshut", eventDate: "2026-10-31T13:00:00Z",
  status: "upcoming", tagType: "pokemon", tags: {}, maxParticipants: 20,
  participationFee: 25, requiresDecklist: true, description: "Bitte rechtzeitig erscheinen.",
  _count: { registrations: 19 },
};

describe("admin event management card", () => {
  it("shows the former details information and copies the registration URL via an icon action", async () => {
    const wrapper = await mountSuspended(AdminEventManagementCard, {
      props: { event, dateLabel: "31.10.2026, 14:00" },
      global: { plugins: [createI18n({ legacy: false, locale: "de", messages: { de: {} } })] },
    });
    const content = wrapper.text();
    expect(content).toContain("Prerelease");
    expect(content).toContain("31.10.2026, 14:00");
    expect(content).toContain("Landshut");
    expect(content).toContain("19 / 20");
    expect(content).toContain("25");
    expect(content).toContain("Bitte rechtzeitig erscheinen.");
    expect(wrapper.find("input[readonly]").exists()).toBe(false);
    await wrapper.find(".event-copy-button").trigger("click");
    expect(wrapper.emitted("copy")).toHaveLength(1);
    expect(wrapper.find(".event-card-actions").text()).toContain("Turnier starten");
  });
});
