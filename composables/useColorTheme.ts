import { readonly } from "vue";

const THEME_STORAGE_KEY = "app-color-theme";
const DEFAULT_THEME = "dark";

export type AppColorTheme = "light" | "dark";

function applyTheme(theme: AppColorTheme) {
  if (!process.client) {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useColorTheme() {
  const theme = useState<AppColorTheme>("app-color-theme", () => DEFAULT_THEME);

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
        : DEFAULT_THEME;

    theme.value = resolvedTheme;
    applyTheme(resolvedTheme);
  };

  return {
    theme: readonly(theme),
    initializeTheme,
    setTheme,
    toggleTheme,
  };
}
