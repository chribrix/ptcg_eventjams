<template>
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-lg">Processing login...</p>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const route = useRoute();

onMounted(async () => {
  const { data, error } = await useSupabaseClient().auth.getSession();

  if (error || !data.session) {
    console.error("Login failed or session missing:", error);
    return;
  }

  // Session is valid, Supabase stores it automatically in localStorage
  console.log("Logged in as:", data.session.user.email);

  const user = data.session.user;
  console.log("User metadata:", user.user_metadata);

  // Check if there's a return URL
  const returnPath = route.query.return as string;
  router.push(returnPath || "/");
});
</script>
