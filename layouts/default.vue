<script setup lang="ts">
import { ref, onMounted } from "vue";

const userName = ref<string | null>(null);

onMounted(async () => {
  const { data: sessionData } = await useSupabaseClient().auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    userName.value = user.user_metadata.name || user.email;
  }
});
</script>

<template>
  <div>
    <header class="shadow-sm bg-white">
      <nav class="container mx-auto flex p-4 justify-between items-center">
        <!-- Left side -->
        <NuxtLink to="/" class="font-bold">Home</NuxtLink>

        <!-- Center -->
        <div v-if="userName" class="text-gray-600 font-semibold">
          Hello, {{ userName }}
        </div>

        <!-- Right side -->
        <ul class="flex gap-4 items-center">
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <li><NuxtLink to="/about">About</NuxtLink></li>
          <li><NuxtLink to="/eventlist">Event List</NuxtLink></li>
          <li v-if="userName">
            <NuxtLink to="/importer" class="text-blue-600 hover:underline"
              >Importer</NuxtLink
            >
          </li>
          <li v-else>
            <NuxtLink
              to="/register"
              class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
            >
              Sign In / Register
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </header>

    <div class="container mx-auto p-4">
      <slot />
    </div>
  </div>
</template>

<style>
.router-link-exact-active {
  color: #12b488;
}
</style>
