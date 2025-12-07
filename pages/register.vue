<template>
  <div>
    <RegisterForm />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { user } = useAuth();

onMounted(() => {
  // If user is already authenticated, redirect to intended page or home
  if (user.value) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
  }
});

// Also watch for user changes
watch(user, (newUser) => {
  if (newUser) {
    const redirectTo = route.query.redirect as string;
    navigateTo(redirectTo || "/");
  }
});
</script>
