export type LandingMockId = "focus" | "editorial" | "split";

const STORAGE_KEY = "landing_mock_variant_v1";

const isLandingMockId = (value: string): value is LandingMockId => {
  return value === "focus" || value === "editorial" || value === "split";
};

export const useLandingMock = () => {
  const landingMock = useState<LandingMockId>("landing-mock-id", () => "editorial");

  const setLandingMock = (value: LandingMockId) => {
    landingMock.value = value;

    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  if (import.meta.client) {
    onMounted(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLandingMockId(stored)) {
        landingMock.value = stored;
      }
    });
  }

  return {
    landingMock,
    setLandingMock,
  };
};
