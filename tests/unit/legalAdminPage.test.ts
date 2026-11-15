import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import LegalAdminPage from "~/pages/admin/legal.vue";

afterEach(() => vi.unstubAllGlobals());

describe("legal admin page", () => {
  it("loads the private draft after mount and shows the editable fields", async () => {
    const fetch = vi.fn().mockResolvedValue({
      operatorName: "Testbetreiber",
      operatorAddress: "Teststraße 1",
      operatorEmail: "test@example.org",
      operatorContact: "",
      impressum: { body: "## Impressum\nEntwurf", published: false },
      datenschutz: { body: "## Datenschutz\nEntwurf", published: false },
    });
    vi.stubGlobal("$fetch", fetch);

    const wrapper = await mountSuspended(LegalAdminPage);
    await flushPromises();

    expect(fetch).toHaveBeenCalledWith("/api/admin/legal");
    expect(wrapper.text()).toContain("Testbetreiber");
    expect(wrapper.find('textarea[aria-label="Datenschutztext"]').element.value).toContain("Entwurf");
    expect(wrapper.find('input[aria-label="Impressum live schalten"]').exists()).toBe(true);
  });
});
