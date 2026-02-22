type LoginStep =
  | "email"
  | "method"
  | "password"
  | "passwordSetup"
  | "magiclink";

export const useLoginWorkflow = () => {
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  const step = ref<LoginStep>("email");
  const email = ref("");
  const password = ref("");
  const newPassword = ref("");
  const newPasswordConfirm = ref("");
  const showPassword = ref(false);
  const showNewPassword = ref(false);
  const showNewPasswordConfirm = ref(false);
  const hasPassword = ref(false);
  const linkSent = ref(false);
  const passwordSetupRequested = ref(false);
  const error = ref("");
  const isLoading = ref(false);
  const eventDetails = ref<any>(null);

  const getMagicLinkRedirect = (
    returnOverride?: string,
    flow?: "set-password",
  ) => {
    const configuredBase = runtimeConfig.public.appBaseUrl?.replace(/\/$/, "");
    const base =
      configuredBase ||
      (process.client ? window.location.origin.replace(/\/$/, "") : "");
    if (!base) return undefined;

    const returnPath = returnOverride || (route.query.redirect as string);
    const params = new URLSearchParams();
    if (returnPath) params.set("return", returnPath);
    if (flow) params.set("flow", flow);
    const query = params.toString();
    return `${base}/confirm${query ? `?${query}` : ""}`;
  };

  const backToEmail = () => {
    step.value = "email";
    password.value = "";
    newPassword.value = "";
    newPasswordConfirm.value = "";
    error.value = "";
    linkSent.value = false;
    passwordSetupRequested.value = false;
  };

  const backToMethod = () => {
    step.value = "method";
    password.value = "";
    newPassword.value = "";
    newPasswordConfirm.value = "";
    error.value = "";
  };

  const loadEventDetails = async () => {
    const redirectTo = route.query.redirect as string;
    if (!redirectTo) return;

    const eventId =
      redirectTo.match(/\/events\/register\/(\w+)/)?.[1] ||
      redirectTo.match(/\/events\/(\w+)/)?.[1];

    if (!eventId) return;

    try {
      const response = await $fetch<{ event: any; registrationCount: number }>(
        `/api/events/${eventId}`,
      );
      if (response.event) {
        eventDetails.value = {
          ...response.event,
          registrationCount: response.registrationCount,
        };
      }
    } catch {
      // no-op
    }
  };

  onMounted(async () => {
    if (user.value) {
      await navigateTo((route.query.redirect as string) || "/");
      return;
    }

    if (typeof route.query.email === "string") {
      email.value = route.query.email;
    }

    await loadEventDetails();
  });

  watch(user, (nextUser) => {
    if (nextUser) {
      navigateTo((route.query.redirect as string) || "/");
    }
  });

  const checkEmail = async () => {
    error.value = "";
    isLoading.value = true;

    try {
      const playerCheck = await $fetch<{
        exists: boolean;
        authExists?: boolean;
        player: { preferredLoginMethod?: "password" | "magiclink" } | null;
      }>("/api/players/check", {
        method: "POST",
        body: { email: email.value },
      });

      const accountExists =
        typeof playerCheck.authExists === "boolean"
          ? playerCheck.authExists
          : playerCheck.exists;

      if (!accountExists) {
        error.value = `Kein Account für ${email.value} gefunden. Bitte zuerst registrieren.`;
        setTimeout(() => {
          const r = route.query.redirect as string;
          navigateTo(
            `/register${
              r
                ? `?redirect=${encodeURIComponent(r)}&email=${encodeURIComponent(email.value)}`
                : `?email=${encodeURIComponent(email.value)}`
            }`,
          );
        }, 2000);
        return;
      }

      const passwordCheck = await $fetch<{ hasPassword: boolean }>(
        "/api/auth/check-password",
        {
          method: "POST",
          body: { email: email.value },
        },
      );

      const passwordState = (passwordCheck as any).passwordState as
        | "has"
        | "missing"
        | "unknown"
        | undefined;

      hasPassword.value = passwordState === "missing" ? false : true;
      step.value = "method";
    } catch (err: any) {
      error.value =
        err?.data?.statusMessage ||
        err?.message ||
        "Fehler beim Prüfen der E-Mail-Adresse.";
    } finally {
      isLoading.value = false;
    }
  };

  const submitPasswordLogin = async () => {
    error.value = "";

    if (!hasPassword.value) {
      step.value = "passwordSetup";
      error.value =
        "Für diesen Account ist noch kein Passwort gesetzt. Bitte jetzt ein Passwort festlegen.";
      return;
    }

    isLoading.value = true;

    try {
      const data = await $fetch<{
        access_token: string;
        refresh_token: string;
      }>("/api/auth/login-password", {
        method: "POST",
        body: { email: email.value, password: password.value },
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      await navigateTo((route.query.redirect as string) || "/");
    } catch (err: any) {
      const msg: string =
        err?.data?.statusMessage || err?.statusMessage || err?.message || "";
      if (msg === "no_password_set") {
        hasPassword.value = false;
        step.value = "passwordSetup";
        error.value =
          "Für diesen Account ist noch kein Passwort gesetzt. Bitte jetzt ein Passwort festlegen.";
        return;
      }
      error.value = msg.toLowerCase().includes("invalid")
        ? "Falsches Passwort. Bitte erneut versuchen."
        : msg || "Login fehlgeschlagen.";
    } finally {
      isLoading.value = false;
    }
  };

  const submitMagicLink = async () => {
    error.value = "";
    linkSent.value = false;
    passwordSetupRequested.value = false;
    isLoading.value = true;

    const redirectTo = getMagicLinkRedirect();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    isLoading.value = false;

    if (signInError) {
      const msg = signInError.message || "";
      if (
        msg.toLowerCase().includes("security purposes") ||
        msg.toLowerCase().includes("after")
      ) {
        const seconds = msg.match(/(\d+)\s*se/)?.[1];
        error.value = seconds
          ? `Bitte warte ${seconds} Sekunden vor dem nächsten Versuch.`
          : "Bitte warte einen Moment vor dem nächsten Versuch.";
      } else {
        error.value = msg;
      }
      return;
    }

    linkSent.value = true;
  };

  const selectPassword = () => {
    error.value = "";
    step.value = hasPassword.value ? "password" : "passwordSetup";
  };

  const selectMagicLink = () => {
    error.value = "";
    step.value = "magiclink";
  };

  const submitInitialPasswordAndLogin = async () => {
    error.value = "";

    if (newPassword.value.length < 8) {
      error.value = "Passwort muss mindestens 8 Zeichen haben.";
      return;
    }

    if (newPassword.value !== newPasswordConfirm.value) {
      error.value = "Passwörter stimmen nicht überein.";
      return;
    }

    isLoading.value = true;

    try {
      const setup = await $fetch<{
        success: boolean;
        mode: "direct" | "confirm_email";
        redirectTo?: string;
        email?: string;
        access_token?: string;
        refresh_token?: string;
      }>("/api/auth/request-password-setup", {
        method: "POST",
        body: {
          email: email.value,
          password: newPassword.value,
          returnPath:
            typeof route.query.redirect === "string"
              ? route.query.redirect
              : undefined,
        },
      });

      if (setup.mode === "direct") {
        if (!setup.access_token || !setup.refresh_token) {
          throw new Error("Direkter Login konnte nicht gestartet werden.");
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: setup.access_token,
          refresh_token: setup.refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }

        hasPassword.value = true;
        await navigateTo((route.query.redirect as string) || "/");
        return;
      }

      if (!setup.email || !setup.redirectTo) {
        throw new Error("Bestätigungs-E-Mail konnte nicht vorbereitet werden.");
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: setup.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: setup.redirectTo,
        },
      });

      if (otpError) {
        throw new Error(
          otpError.message ||
            "Bestätigungs-E-Mail konnte nicht gesendet werden.",
        );
      }

      passwordSetupRequested.value = true;
      linkSent.value = true;
      step.value = "magiclink";
    } catch (err: any) {
      const msg: string =
        err?.data?.statusMessage || err?.statusMessage || err?.message || "";

      if (msg === "password_already_set") {
        hasPassword.value = true;
        step.value = "password";
        error.value =
          "Für diesen Account ist bereits ein Passwort gesetzt. Bitte normal einloggen.";
      } else {
        error.value = msg || "Passwort konnte nicht gesetzt werden.";
      }
    } finally {
      isLoading.value = false;
    }
  };

  return {
    step,
    email,
    password,
    newPassword,
    newPasswordConfirm,
    showPassword,
    showNewPassword,
    showNewPasswordConfirm,
    hasPassword,
    linkSent,
    passwordSetupRequested,
    error,
    isLoading,
    eventDetails,
    backToEmail,
    backToMethod,
    checkEmail,
    selectPassword,
    selectMagicLink,
    submitPasswordLogin,
    submitInitialPasswordAndLogin,
    submitMagicLink,
  };
};
