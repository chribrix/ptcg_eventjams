<template>
  <div
    v-if="isImpersonating"
    class="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
  >
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-3">
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <div class="flex-shrink-0">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">
              Du imitierst gerade:
              <span class="font-bold">{{ impersonatedUser?.name }}</span>
              <span v-if="impersonatedUser?.email" class="text-amber-100 ml-2">
                ({{ impersonatedUser.email }})
              </span>
            </p>
            <p class="text-xs text-amber-100 mt-0.5">
              Alle Aktionen werden im Namen dieses Spielers ausgeführt
            </p>
          </div>
        </div>
        <button
          @click="handleStopImpersonation"
          class="flex-shrink-0 ml-4 px-4 py-2 bg-white text-orange-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors duration-200 shadow-sm"
        >
          Imitierung beenden
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { impersonatedUser, isImpersonating, stopImpersonation } =
  useImpersonation();
const router = useRouter();

const handleStopImpersonation = () => {
  stopImpersonation();
  router.push("/admin/players");
};
</script>
