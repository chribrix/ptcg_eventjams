<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-[99999]"
        @click="$emit('close')"
      >
        <div
          class="bg-white rounded-xl shadow-xl max-w-2xl max-h-[80vh] w-[90%] overflow-hidden flex flex-col transform transition-transform min-w-0"
          @click.stop
        >
          <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"
          >
            <h3 class="text-xl font-semibold text-gray-900 m-0">
              Events on {{ formattedDate }}
            </h3>
            <button
              @click="$emit('close')"
              class="bg-none border-none text-2xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer p-1 rounded transition-colors duration-200"
            >
              &times;
            </button>
          </div>
          <div class="px-6 py-4 overflow-y-auto flex-1">
            <div
              v-for="event in events"
              :key="event.id"
              class="border border-gray-200 rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md hover:border-gray-300 last:mb-0 min-w-0"
              :class="{
                'border-l-4': isCustomEvent(event),
              }"
              :style="
                isCustomEvent(event)
                  ? {
                      borderLeftColor:
                        getEventBadgeStyles(event).backgroundColor,
                      background: `linear-gradient(to right, ${
                        getEventBadgeStyles(event).backgroundColor
                      }10, white)`,
                    }
                  : {}
              "
              style="word-break: break-word; overflow-wrap: anywhere"
            >
              <div class="flex justify-between items-center mb-3">
                <div class="flex flex-col w-full gap-1">
                  <!-- Top row: Event type badge -->
                  <div class="w-full mb-1">
                    <div
                      class="inline-block w-full px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide min-w-0 text-center"
                      :style="getEventBadgeStyles(event)"
                      style="word-break: break-word; overflow-wrap: anywhere"
                    >
                      {{ getEventTypeLabel(event) }}
                    </div>
                  </div>
                  <!-- Second row: Cost and time badges -->
                  <div class="flex flex-wrap gap-2 w-full justify-center">
                    <div
                      v-if="getEventCost(event) !== undefined"
                      class="flex items-center gap-1 text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-200"
                    >
                      <CurrencyDollarIcon class="w-4 h-4 flex-shrink-0" />
                      {{ formatEventCost(event) }}
                    </div>
                    <div
                      v-if="getEventTime(event)"
                      class="text-base font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full"
                    >
                      {{ getEventTime(event) }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <div
                    v-if="event.venue"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <BuildingOfficeIcon class="w-4 h-4 flex-shrink-0" />
                    <span
                      class="flex-1 min-w-0"
                      style="word-break: break-word; overflow-wrap: anywhere"
                      >{{ stripHtmlTags(event.venue) }}</span
                    >
                  </div>
                  <div
                    v-if="event.streetAddress"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <MapPinIcon class="w-4 h-4 flex-shrink-0" />
                    <span
                      class="flex-1 min-w-0"
                      style="word-break: break-word; overflow-wrap: anywhere"
                      >{{ stripHtmlTags(event.streetAddress) }}</span
                    >
                  </div>
                  <div
                    v-if="event.location"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <GlobeAltIcon class="w-4 h-4 flex-shrink-0" />
                    <span
                      class="flex-1 min-w-0"
                      style="word-break: break-word; overflow-wrap: anywhere"
                      >{{ stripHtmlTags(event.location)
                      }}{{
                        event.country ? `, ${stripHtmlTags(event.country)}` : ""
                      }}</span
                    >
                  </div>
                  <div
                    v-if="isCustomEvent(event)"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <UsersIcon class="w-4 h-4 flex-shrink-0" />
                    <span class="flex-1">{{
                      getRegistrationCount(event)
                    }}</span>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <div
                    v-if="isCustomEvent(event)"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <NuxtLink
                      :to="
                        isUserLoggedIn
                          ? `/events/register/${event.id}`
                          : '/login'
                      "
                      class="flex items-center gap-2 text-blue-600 no-underline font-medium text-sm px-3 py-2 bg-blue-50 rounded-md transition-all duration-200 border border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                    >
                      <UserPlusIcon class="w-4 h-4 flex-shrink-0" />
                      <span>Register</span>
                    </NuxtLink>
                  </div>
                  <div
                    v-else-if="hasLocalRegistration(event)"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <NuxtLink
                      :to="
                        isUserLoggedIn
                          ? `/events/register/${event.id}`
                          : '/login'
                      "
                      class="flex items-center gap-2 text-blue-600 no-underline font-medium text-sm px-3 py-2 bg-blue-50 rounded-md transition-all duration-200 border border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                    >
                      <UserPlusIcon class="w-4 h-4 flex-shrink-0" />
                      <span>Register</span>
                    </NuxtLink>
                  </div>
                  <div
                    v-else-if="event.link && event.link !== '//'"
                    class="flex items-center gap-2 text-gray-600 text-sm leading-relaxed"
                  >
                    <a
                      :href="event.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 text-blue-600 no-underline font-medium text-sm px-3 py-2 bg-blue-50 rounded-md transition-all duration-200 border border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                    >
                      <LinkIcon class="w-4 h-4 flex-shrink-0" />
                      <span>Register</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  GlobeAltIcon,
  UsersIcon,
  UserPlusIcon,
  LinkIcon,
} from "@heroicons/vue/24/outline";
import { getEventBadgeStyles as getColorStyles } from "~/utils/eventColors";

interface ParsedEvent {
  id: string;
  title: string;
  dateTime: string;
  time?: string;
  type: string;
  venue: string;
  location: string;
  country: string;
  link: string;
  cost?: string;
  streetAddress?: string;
  icon?: string;
  isCustomEvent?: boolean;
  eventType?: string;
}

interface CustomEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  registrationCount?: number;
  eventType?: string;
}

// Props
defineProps<{
  events: ParsedEvent[];
  formattedDate: string;
}>();

// Emits
defineEmits<{
  close: [];
}>();

// For accessing custom events data (assuming it's available globally or passed down)
const customEvents = ref<CustomEvent[]>([]);
const supabase = useSupabaseClient();
const isUserLoggedIn = ref(false);

// Load custom events if needed
onMounted(async () => {
  try {
    const response = await $fetch<{ success: boolean; events: CustomEvent[] }>(
      "/api/events/custom"
    );
    if (response.success && response.events) {
      customEvents.value = response.events;
    }
  } catch (error) {
    console.error("Failed to load custom events:", error);
  }

  // Check if user is logged in
  const { data: session } = await supabase.auth.getSession();
  isUserLoggedIn.value = !!session?.session;
});

// Helper functions
const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
};

const isCustomEvent = (event: ParsedEvent): boolean => {
  return !!event.isCustomEvent;
};

const hasLocalRegistration = (event: ParsedEvent): boolean => {
  return !!(event as any).hasLocalRegistration;
};

const getEventBadgeStyles = (
  event: ParsedEvent
): { backgroundColor: string; color: string } => {
  // Custom events - use their eventType
  if (isCustomEvent(event)) {
    const eventType = event.eventType || "custom";
    return getColorStyles(eventType);
  }

  // Regular events get colors based on their icon/type
  if (event.icon) {
    return getColorStyles(event.icon);
  }

  // Fallback based on type string
  return getColorStyles(event.type);
};

const getEventTypeLabel = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    const eventType = event.eventType || "custom";
    const labels: Record<string, string> = {
      cup: "League Cup",
      challenge: "League Challenge",
      local: "Local Event",
      custom: "Custom Event",
    };
    return labels[eventType] || "Custom Event";
  }
  return event.type;
};

const getEventCost = (event: ParsedEvent): number | string | undefined => {
  if (isCustomEvent(event)) {
    // For custom events, we need to find the original event to get participationFee
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    return customEvent?.participationFee;
  }
  return event.cost;
};

const formatEventCost = (event: ParsedEvent): string => {
  const cost = getEventCost(event);
  if (cost === undefined || cost === null) return "?";
  if (isCustomEvent(event)) {
    const numericCost = typeof cost === "string" ? parseFloat(cost) : cost;
    return numericCost > 0 ? `€${numericCost}` : "Free";
  }
  return String(cost) || "?";
};

const formatEventTime = (event: ParsedEvent): string => {
  // First try to use the separate time field if available
  if (event.time) {
    return event.time;
  }

  // Fallback to extracting from dateTime if it contains time
  if (event.dateTime && event.dateTime.includes(" ")) {
    const timePart = event.dateTime.split(" ")[1]; // Extract HH:MM part
    if (timePart) {
      return timePart.substring(0, 5); // Get HH:MM from HH:MM:SS
    }
  }

  // Last fallback - try to extract from title
  if (event.title) {
    const timeMatch = event.title.match(/(\d{2}:\d{2})/);
    if (timeMatch) {
      return timeMatch[1];
    }
  }

  return "All Day";
};

const getEventTime = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    // For custom events, we need to find the original event to get the eventDate
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      const eventDate = new Date(customEvent.eventDate);
      return eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return "All Day";
  }
  return formatEventTime(event);
};

const getRegistrationCount = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      const registeredCount = customEvent.registrationCount || 0;
      return `${registeredCount}/${customEvent.maxParticipants} registered`;
    }
  }
  return "";
};
</script>
