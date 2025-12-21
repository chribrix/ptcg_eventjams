export default defineNuxtPlugin(() => {
  const { impersonatedUser } = useImpersonation();

  // Intercept $fetch calls to add impersonation header
  const $fetch = globalThis.$fetch;

  globalThis.$fetch = $fetch.create({
    onRequest({ options }) {
      if (impersonatedUser.value) {
        options.headers = {
          ...options.headers,
          "x-impersonate-user-id": impersonatedUser.value.id,
        };
      }
    },
  });
});
