<template>
  <div
    class="flex w-full items-center rounded-lg shadow-sm overflow-hidden transition-all duration-200"
    :class="isActive ? 'hover:shadow-lg' : 'opacity-75'"
  >
    <button
      type="button"
      class="inline-flex flex-1 items-center justify-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap min-w-0 active:scale-95"
      :class="isActive ? 'hover:brightness-110 cursor-pointer' : 'cursor-pointer'"
      :style="mainButtonStyle"
      :title="`Show upcoming ${label} events`"
      @click="$emit('select')"
    >
      <span>{{ label }}</span>
      <svg
        class="w-3 h-3 opacity-70"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </button>

    <button
      type="button"
      class="inline-flex items-center justify-center px-2 py-1 sm:py-1.5 border-l transition-colors duration-200 active:scale-95"
      :style="toggleButtonStyle"
      :title="
        isActive
          ? `Hide ${label} in calendar`
          : `Show ${label} in calendar again`
      "
      :aria-pressed="isActive"
      @click="$emit('toggle')"
    >
      <svg
        v-if="isActive"
        class="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 3l18 18M10.584 10.587A3 3 0 0013.41 13.4M9.88 5.09A9.77 9.77 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.76 9.76 0 01-3.232 4.568M6.228 6.233A9.76 9.76 0 002.458 12c1.274 4.057 5.064 7 9.542 7 1.672 0 3.25-.41 4.636-1.135"
        />
      </svg>
      <svg
        v-else
        class="w-3.5 h-3.5"
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
          d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
}>();

defineEmits<{
  select: [];
  toggle: [];
}>();

const mainButtonStyle = computed(() => ({
  backgroundColor: props.isActive ? props.backgroundColor : "#4b5563",
  color: props.isActive ? props.textColor : "#e5e7eb",
}));

const toggleButtonStyle = computed(() => ({
  backgroundColor: props.isActive ? "rgba(0, 0, 0, 0.12)" : "#1f2937",
  color: props.isActive ? props.textColor : "#f9fafb",
  borderColor: props.isActive ? "rgba(0, 0, 0, 0.12)" : "#374151",
}));
</script>
