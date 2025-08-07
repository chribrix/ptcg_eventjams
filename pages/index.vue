<template></template>

<script setup lang="ts">
const userName = ref<string | null>(null);

onMounted(async () => {
  const { data: session } = await useSupabaseClient().auth.getSession();
  if (session?.session) {
    userName.value =
      session.session.user.user_metadata.name || session.session.user.email;
  }
});
</script>

<style lang="scss" scoped></style>
