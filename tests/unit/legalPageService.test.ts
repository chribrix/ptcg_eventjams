import { describe, expect, it, vi } from "vitest";
const { findUnique, upsert } = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn() }));
vi.mock("~/lib/prisma", () => ({ default: { metaState: { findUnique, upsert } } }));
import { defaultLegalState, getPublishedLegalPage, parseLegalState, saveLegalState, validateLegalPublication } from "~/server/services/legal/legalPageService";

describe("legal publication", () => {
  it("starts with private drafts and meaningful text", () => {
    const state = parseLegalState(null);
    expect(state.impressum.published).toBe(false);
    expect(state.datenschutz.published).toBe(false);
    expect(state.datenschutz.body).toContain("Veranstaltungskalender und Anmeldung");
  });

  it("does not publish missing operator details or unfinished text", () => {
    const state = defaultLegalState();
    state.impressum.published = true;
    expect(() => validateLegalPublication(state)).toThrow(/Name, Anschrift/);
    state.operatorName = "Beispiel Betreiber";
    state.operatorAddress = "Beispielstraße 1\n12345 Beispielstadt";
    state.operatorEmail = "kontakt@example.org";
    expect(() => validateLegalPublication(state)).toThrow(/Platzhalter/);
    state.impressum.body = "## Weitere Angaben\nKeine weiteren Pflichtangaben.";
    expect(() => validateLegalPublication(state)).not.toThrow();
  });

  it("saves incomplete fields as a private draft before the live switch is enabled", async () => {
    const state = defaultLegalState();
    state.operatorName = "Noch unvollständig";
    expect(() => validateLegalPublication(state)).not.toThrow();
    await saveLegalState(state, "admin-1");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ value: expect.objectContaining({
        impressum: expect.objectContaining({ published: false }),
        datenschutz: expect.objectContaining({ published: false }),
      }) }),
    }));
  });

  it("never exposes operator drafts through the public read contract", async () => {
    const state = defaultLegalState();
    state.operatorName = "Private name";
    state.operatorAddress = "Private address";
    state.operatorEmail = "private@example.org";
    findUnique.mockResolvedValueOnce({ value: state });
    const page = await getPublishedLegalPage("impressum");
    expect(page).toEqual({ published: false, operatorName: "", operatorAddress: "", operatorEmail: "", operatorContact: "", body: "" });
  });

  it("shows fields only for the page whose live switch was saved", async () => {
    const state = defaultLegalState();
    state.operatorName = "Live Betreiber";
    state.operatorAddress = "Straße 1";
    state.operatorEmail = "live@example.org";
    state.impressum = { body: "## Angaben\nFertig.", published: true };
    findUnique.mockResolvedValue({ value: state });
    expect((await getPublishedLegalPage("impressum")).operatorName).toBe("Live Betreiber");
    expect(await getPublishedLegalPage("datenschutz")).toEqual({ published: false, operatorName: "", operatorAddress: "", operatorEmail: "", operatorContact: "", body: "" });
  });
});
