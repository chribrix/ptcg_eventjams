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
        @click="emit('close')"
      >
        <div
          class="bg-[#2f3136] rounded-xl shadow-xl max-w-2xl max-h-[80vh] w-[90%] overflow-hidden flex flex-col transform transition-transform min-w-0"
          @click.stop
        >
          <div
            class="px-6 py-4 border-b border-[#202225] flex justify-between items-center bg-[#36393f]"
          >
            <h3 class="text-xl font-semibold text-white m-0">
              Events on {{ formattedDate }}
            </h3>
            <button
              @click="emit('close')"
              class="bg-none border-none text-2xl text-gray-400 hover:bg-[#40444b] hover:text-gray-300 cursor-pointer p-1 rounded transition-colors duration-200"
            >
              &times;
            </button>
          </div>
          <div class="px-6 py-4 overflow-y-auto flex-1">
            <div
              v-for="event in events"
              :key="event.id"
              class="border border-[#202225] rounded-lg mb-2 transition-all duration-200 hover:shadow-md hover:border-[#40444b] last:mb-0 min-w-0 border-l-4 cursor-pointer bg-[#36393f]"
              :style="{
                borderLeftColor: getEventBadgeStyles(event).backgroundColor,
              }"
              @click="toggleEventExpanded(event.id)"
            >
              <!-- Compact View -->
              <div class="p-3 flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-semibold text-white mb-1 truncate">
                    {{ getEventTitle(event) }}
                  </h4>
                  <div class="flex items-center gap-2 text-xs text-gray-300">
                    <MapPinIcon class="w-3 h-3 flex-shrink-0" />
                    <span class="truncate">{{ getCityFromEvent(event) }}</span>
                    <span class="text-gray-400">•</span>
                    <CalendarIcon class="w-3 h-3 flex-shrink-0" />
                    <span>{{ getCompactDate(event) }}</span>
                  </div>
                </div>
                <svg
                  class="w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-200"
                  :class="{ 'rotate-180': expandedEvents.has(event.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              <!-- Expanded View -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="max-h-0 opacity-0"
                enter-to-class="max-h-[1000px] opacity-100"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-[1000px] opacity-100"
                leave-to-class="max-h-0 opacity-0"
              >
                <div
                  v-if="expandedEvents.has(event.id)"
                  class="px-3 pb-3 border-t border-[#202225] overflow-hidden"
                  @click.stop
                >
                  <div class="pt-3">
                    <!-- Badges row: Type, Time, Cost -->
                    <div class="flex flex-wrap gap-2 mb-3 items-center">
                      <!-- Type badge with dynamic color -->
                      <div
                        class="inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide"
                        :style="getEventBadgeStyles(event)"
                      >
                        {{ getEventTypeLabel(event) }}
                      </div>
                      <!-- Time badge -->
                      <div
                        v-if="getEventTime(event)"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-300 bg-[#40444b] border border-[#202225]"
                      >
                        <ClockIcon class="w-3 h-3 flex-shrink-0" />
                        <span>{{ getEventTime(event) }}</span>
                      </div>
                      <!-- Cost badge -->
                      <div
                        v-if="getEventCost(event) !== undefined"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-300 bg-[#40444b] border border-[#202225]"
                      >
                        <CurrencyDollarIcon class="w-3 h-3 flex-shrink-0" />
                        <span>{{ formatEventCost(event) }}</span>
                      </div>
                    </div>

                    <!-- Event details -->
                    <div class="flex flex-col gap-2 mb-3">
                      <div
                        v-if="event.venue"
                        class="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <BuildingOfficeIcon
                          class="w-4 h-4 flex-shrink-0 mt-0.5"
                        />
                        <span class="flex-1 min-w-0">{{
                          stripHtmlTags(event.venue)
                        }}</span>
                      </div>
                      <div
                        v-if="event.streetAddress"
                        class="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <MapPinIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span class="flex-1 min-w-0">{{
                          stripHtmlTags(event.streetAddress)
                        }}</span>
                      </div>
                      <div
                        v-if="event.location"
                        class="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <GlobeAltIcon class="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span class="flex-1 min-w-0"
                          >{{ stripHtmlTags(event.location)
                          }}{{
                            event.country
                              ? `, ${stripHtmlTags(event.country)}`
                              : ""
                          }}</span
                        >
                      </div>
                      <div
                        v-if="isCustomEvent(event)"
                        class="flex items-center gap-2 text-gray-300 text-sm"
                      >
                        <UsersIcon class="w-4 h-4 flex-shrink-0" />
                        <span class="flex-1">{{
                          getRegistrationCount(event)
                        }}</span>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div
                      class="flex justify-end gap-2 pt-2 border-t border-[#202225]"
                    >
                      <a
                        v-if="getGoogleMapsUrl(event)"
                        :href="getGoogleMapsUrl(event)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 bg-[#40444b] border border-[#202225] hover:bg-[#4f545c] hover:border-gray-500 shadow-sm transition-all duration-200 no-underline"
                        @click.stop
                      >
                        <MapIcon class="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Routenplaner</span>
                      </a>
                      <NuxtLink
                        v-if="
                          isCustomEvent(event) || hasLocalRegistration(event)
                        "
                        :to="
                          isUserLoggedIn
                            ? `/events/register/${event.id}`
                            : '/login'
                        "
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black shadow-sm transition-all duration-200 no-underline"
                        @click.stop
                      >
                        <UserPlusIcon class="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Register</span>
                      </NuxtLink>
                      <a
                        v-else-if="event.link && event.link !== '//'"
                        :href="event.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 bg-[#40444b] border border-[#202225] hover:bg-[#4f545c] hover:border-gray-500 shadow-sm transition-all duration-200 no-underline"
                        @click.stop
                      >
                        <LinkIcon class="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Details</span>
                      </a>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <!-- Back button at bottom -->
          <div
            class="px-6 py-4 border-t border-[#202225] bg-[#2f3136] flex justify-end"
          >
            <button
              @click="emit('close')"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <span>← Zurück</span>
            </button>
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
  ClockIcon,
  CalendarIcon,
  MapIcon,
} from "@heroicons/vue/24/outline";
import { getEventBadgeStyles as getColorStyles } from "~/utils/eventColors";

interface ParsedEvent {
  id: string;
  title: string;
  name?: string; // Event name from API
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
const props = defineProps<{
  events: ParsedEvent[];
  formattedDate: string;
}>();

// Emits
const emit = defineEmits<{
  (e: "close"): void;
}>();

// For accessing custom events data (assuming it's available globally or passed down)
const customEvents = ref<CustomEvent[]>([]);
const supabase = useSupabaseClient();
const isUserLoggedIn = ref(false);
const expandedEvents = ref<Set<string>>(new Set());

// Auto-expand all events if there are 3 or fewer
watch(
  () => props.events,
  (newEvents) => {
    if (newEvents.length <= 3) {
      expandedEvents.value = new Set(newEvents.map((e) => e.id));
    } else {
      expandedEvents.value.clear();
    }
  },
  { immediate: true }
);

// Toggle event expanded state
const toggleEventExpanded = (eventId: string) => {
  if (expandedEvents.value.has(eventId)) {
    expandedEvents.value.delete(eventId);
  } else {
    expandedEvents.value.add(eventId);
  }
};

// Get city from location string
const getCityFromEvent = (event: ParsedEvent): string => {
  if (event.location) {
    // Try to extract city from location string
    const locationParts = event.location.split(",");
    return locationParts[0].trim() || event.location;
  }
  return event.venue || "Location TBD";
};

// Get compact date format
const getCompactDate = (event: ParsedEvent): string => {
  const dateStr = event.dateTime.includes(" ")
    ? event.dateTime.split(" ")[0]
    : event.dateTime;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

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

const getEventTitle = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      return customEvent.name;
    }
  }
  // For external events, use name field first, then fall back to title or venue
  return event.name || event.title || event.venue || "Event";
};

const getEventDate = (event: ParsedEvent): string => {
  if (isCustomEvent(event)) {
    const customEvent = customEvents.value.find(
      (ce) => String(ce.id) === event.id
    );
    if (customEvent) {
      const eventDate = new Date(customEvent.eventDate);
      return eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  // For external events, format the dateTime
  if (event.dateTime) {
    const eventDate = new Date(event.dateTime);
    return eventDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return "";
};

const getGoogleMapsUrl = (event: ParsedEvent): string => {
  const address = event.streetAddress || event.venue || event.location;
  if (!address) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`;
};
</script>
