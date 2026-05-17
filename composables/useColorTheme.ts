import { readonly } from "vue";

const THEME_STORAGE_KEY = "app-color-theme";

export type AppColorTheme = "light" | "dark";

function getSystemTheme(): AppColorTheme {
  if (
    process.client &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme: AppColorTheme) {
  if (!process.client) {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useColorTheme() {
  const theme = useState<AppColorTheme>("app-color-theme", () => "light");

  const setTheme = (nextTheme: AppColorTheme) => {
    theme.value = nextTheme;
    applyTheme(nextTheme);

    if (process.client) {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme.value === "dark" ? "light" : "dark");
  };

  const initializeTheme = () => {
    if (!process.client) {
      return;
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const resolvedTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? (savedTheme as AppColorTheme)
        : getSystemTheme();

    theme.value = resolvedTheme;
    applyTheme(resolvedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        return;
      }

      const nextTheme: AppColorTheme = event.matches ? "dark" : "light";
      theme.value = nextTheme;
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
  };

  return {
    theme: readonly(theme),
    initializeTheme,
    setTheme,
    toggleTheme,
  };
}
