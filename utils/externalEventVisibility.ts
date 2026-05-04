type ExternalEventVisibilityInput = {
  venue?: string | null;
  streetAddress?: string | null;
};

function normalize(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function normalizeVenue(value: string | null | undefined) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

export function isDefaultHiddenExternalEvent(
  event: ExternalEventVisibilityInput,
) {
  const venue = normalizeVenue(event.venue);
  const streetAddress = normalize(event.streetAddress);

  const isTargetVenue = venue === "crowsandowls";
  const isTargetAddress = streetAddress.includes("herrngasse 379");

  return isTargetVenue && isTargetAddress;
}
