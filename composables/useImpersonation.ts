export const useImpersonation = () => {
  const impersonatedUser = useState<{
    id: string;
    name: string;
    email: string;
  } | null>("impersonatedUser", () => null);

  const isImpersonating = computed(() => !!impersonatedUser.value);

  const startImpersonation = (user: {
    id: string;
    name: string;
    email: string;
  }) => {
    impersonatedUser.value = user;
    // Store in sessionStorage so it persists across page reloads but not browser sessions
    if (process.client) {
      sessionStorage.setItem("impersonatedUser", JSON.stringify(user));
    }
  };

  const stopImpersonation = () => {
    impersonatedUser.value = null;
    if (process.client) {
      sessionStorage.removeItem("impersonatedUser");
    }
  };

  // Restore impersonation from sessionStorage on mount
  if (process.client) {
    const stored = sessionStorage.getItem("impersonatedUser");
    if (stored) {
      try {
        impersonatedUser.value = JSON.parse(stored);
      } catch (e) {
        sessionStorage.removeItem("impersonatedUser");
      }
    }
  }

  return {
    impersonatedUser: readonly(impersonatedUser),
    isImpersonating,
    startImpersonation,
    stopImpersonation,
  };
};
