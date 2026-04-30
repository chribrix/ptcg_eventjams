type LoginStep =
  | "email"
  | "method"
  | "password"
  | "passwordSetup"
  | "otp";

export const useLoginWorkflow = () => {
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  const step = ref<LoginStep>("email");
  const email = ref("");
  const password = ref("");
  const otpCode = ref("");
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
  const isOtpPasswordSetupConfirmation = ref(false);

  const backToEmail = () => {
    step.value = "email";
    password.value = "";
    newPassword.value = "";
    newPasswordConfirm.value = "";
    otpCode.value = "";
    error.value = "";
    linkSent.value = false;
    passwordSetupRequested.value = false;
    isOtpPasswordSetupConfirmation.value = false;
  };

  const backToMethod = () => {
    step.value = "method";
    password.value = "";
    newPassword.value = "";
    newPasswordConfirm.value = "";
    otpCode.value = "";
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
        player: { preferredLoginMethod?: "password" | "otp" } | null;
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

      // Only treat "has" as having a password.
      // "missing", "unknown" (legacy accounts without app_metadata.has_password)
      // and undefined all mean: no password is set → show the setup screen directly.
      hasPassword.value = passwordState === "has";
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

  const submitOtpRequest = async () => {
    error.value = "";
    linkSent.value = false;
    passwordSetupRequested.value = false;
    isOtpPasswordSetupConfirmation.value = false;
    isLoading.value = true;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        shouldCreateUser: false,
      },
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
    step.value = "otp";
  };

  const selectPassword = () => {
    error.value = "";
    step.value = hasPassword.value ? "password" : "passwordSetup";
  };

  const selectOtp = () => {
    error.value = "";
    otpCode.value = "";
    step.value = "otp";
  };

  const completeOtpSignIn = async () => {
    const playerCheck = await $fetch<{
      exists: boolean;
      player?: { playerId?: string } | null;
    }>("/api/players/check", {
      method: "POST",
      body: {
        email: email.value,
      },
    });

    if (!playerCheck.exists) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.user_metadata?.name && authUser?.user_metadata?.playerId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Session could not be established.");
        }

        await $fetch("/api/auth/ensure-player", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { preferredLoginMethod: "otp" },
        });
      } else {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error(
          `We couldn't find an account for ${email.value}. Please register first.`,
        );
      }
    }

    try {
      await $fetch("/api/players/preferred-login-method", {
        method: "POST",
        body: { method: "otp" },
      });
    } catch {
      // best-effort only
    }

    await navigateTo((route.query.redirect as string) || "/");
  };

  const submitOtpVerification = async () => {
    error.value = "";

    if (!otpCode.value.trim()) {
      error.value = "Bitte gib den E-Mail-Code ein.";
      return;
    }

    isLoading.value = true;

    try {
      const {
        data: { session },
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email: email.value,
        token: otpCode.value.trim(),
        type: "email",
      });

      if (verifyError || !session) {
        throw verifyError || new Error("Code verification failed");
      }

      if (isOtpPasswordSetupConfirmation.value) {
        await $fetch("/api/auth/finalize-password-setup", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        await navigateTo("/password-set-success");
        return;
      }

      await completeOtpSignIn();
    } catch (err: any) {
      const msg: string =
        err?.data?.statusMessage || err?.statusMessage || err?.message || "";
      error.value =
        msg || "Der E-Mail-Code konnte nicht bestätigt werden. Bitte versuche es erneut.";
    } finally {
      isLoading.value = false;
    }
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
        mode: "direct" | "confirm_code";
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

      if (!setup.email) {
        throw new Error("Bestätigungs-Code konnte nicht vorbereitet werden.");
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: setup.email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        throw new Error(
          otpError.message ||
            "Bestätigungs-Code konnte nicht gesendet werden.",
        );
      }

      isOtpPasswordSetupConfirmation.value = true;
      passwordSetupRequested.value = true;
      linkSent.value = true;
      step.value = "otp";
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
    otpCode,
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
    selectOtp,
    submitPasswordLogin,
    submitInitialPasswordAndLogin,
    submitOtpRequest,
    submitOtpVerification,
  };
};
