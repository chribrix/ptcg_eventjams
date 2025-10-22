<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
      :class="{ 'ring-2 ring-blue-500 ring-offset-1': isOpen }"
    >
      <LanguageIcon class="w-4 h-4" />
      <span>{{ current.name }}</span>
      <ChevronDownIcon
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <button
        v-for="localeItem in availableLocales"
        :key="localeItem.code"
        @click="switchLocale(localeItem.code)"
        class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors duration-200 flex items-center gap-3"
        :class="{
          'bg-blue-50 text-blue-700 font-medium': localeItem.code === locale,
        }"
      >
        <span class="text-lg">{{ getFlag(localeItem.code) }}</span>
        <span>{{ localeItem.name }}</span>
        <CheckIcon
          v-if="localeItem.code === locale"
          class="w-4 h-4 ml-auto text-blue-600"
        />
      </button>
    </div>

    <!-- Click outside to close -->
    <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-40"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  LanguageIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/vue/24/outline";

const { locale, locales, setLocale } = useI18n();
const { push } = useRouter();
const switchLocalePath = useSwitchLocalePath();

const isOpen = ref(false);

// Get available locales from i18n configuration
const availableLocales = computed(() => {
  return locales.value as Array<{ code: string; name: string; iso: string }>;
});

const current = computed(() => {
  return (
    availableLocales.value.find((l) => l.code === locale.value) ||
    availableLocales.value[0]
  );
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const switchLocale = async (newLocale: string) => {
  if (newLocale === locale.value) {
    isOpen.value = false;
    return;
  }

  // Use Nuxt i18n's built-in locale switching
  const localePath = switchLocalePath(newLocale as "en" | "de");
  await navigateTo(localePath);

  isOpen.value = false;
};

const getFlag = (localeCode: string): string => {
  const flags: Record<string, string> = {
    en: "🇺🇸",
    de: "🇩🇪",
  };
  return flags[localeCode] || "🌐";
};

// Close dropdown when clicking outside or pressing escape
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>
