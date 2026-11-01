<template>
  <div>
    <button
      type="button"
      class="app-text-secondary-soft inline-flex min-h-9 items-center gap-1.5 rounded-full border app-border px-3 py-1.5 text-xs font-semibold transition hover:brightness-125"
      @click="open = true"
    >
      <MapPinIcon class="h-4 w-4" aria-hidden="true" />
      <span>{{ buttonLabel }}</span>
      <AdjustmentsHorizontalIcon class="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
    </button>

    <AppModal
      v-if="open"
      :title="t('eventLocation.title')"
      :subtitle="t('eventLocation.subtitle')"
      size="sm"
      @close="close"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-1 rounded-xl border app-border p-1">
          <button
            v-for="option in modes"
            :key="option.key"
            type="button"
            class="min-h-10 rounded-lg px-1 text-[11px] font-semibold sm:text-xs"
            :class="mode === option.key ? 'app-chip-active' : 'app-text-secondary-soft'"
            @click="mode = option.key; error = ''"
          >{{ t(option.label) }}</button>
        </div>

        <div v-if="mode !== 'state'" class="space-y-3">
          <label class="block text-sm font-semibold app-text-strong">
            {{ t('eventLocation.country') }}
            <select v-model="country" class="app-input mt-1 w-full rounded-xl px-3 py-2.5">
              <option value="DE">{{ t('eventLocation.countryDE') }}</option>
              <option value="AT">{{ t('eventLocation.countryAT') }}</option>
              <option value="CH">{{ t('eventLocation.countryCH') }}</option>
            </select>
          </label>
          <label v-if="mode === 'postcode'" class="block text-sm font-semibold app-text-strong">
            {{ t('eventLocation.postcode') }}
            <input
              v-model.trim="postcode"
              inputmode="numeric"
              autocomplete="postal-code"
              :maxlength="country === 'DE' ? 5 : 4"
              :placeholder="t('eventLocation.postcodePlaceholder')"
              class="app-input mt-1 w-full rounded-xl px-3 py-2.5"
              @keydown.enter.prevent="apply"
            />
          </label>
          <label class="block text-sm font-semibold app-text-strong">
            {{ t('eventLocation.radius', { radius: radiusKm }) }}
            <input v-model.number="radiusKm" type="range" min="20" max="200" step="10" class="mt-2 w-full accent-cyan-500" />
          </label>
        </div>
        <label v-else class="block text-sm font-semibold app-text-strong">
          {{ t('eventLocation.state') }}
          <select v-model="state" class="app-input mt-1 w-full rounded-xl px-3 py-2.5">
            <option v-for="name in germanStates" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>

        <p v-if="error" class="app-feedback-danger rounded-lg px-3 py-2 text-xs" role="alert">{{ error }}</p>
        <p class="app-text-muted-soft text-xs leading-relaxed">{{ t('eventLocation.privacy') }}</p>
        <p v-if="mode === 'device'" class="app-text-muted-soft text-xs leading-relaxed">
          {{ t('eventLocation.devicePlaceInfo') }}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" class="underline">© OpenStreetMap-Mitwirkende</a>
        </p>
      </div>
      <template #footer>
        <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" class="app-btn-neutral min-h-10 rounded-xl px-4 text-sm font-semibold" @click="useDefault">
            {{ t('eventLocation.useDefault') }}
          </button>
          <button type="button" class="app-btn-primary min-h-10 rounded-xl px-4 text-sm font-bold" :disabled="busy" @click="apply">
            {{ busy ? t('eventLocation.saving') : t(mode === 'postcode' ? 'eventLocation.applyPostcode' : mode === 'device' ? 'eventLocation.applyDevice' : 'eventLocation.applyState') }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { AdjustmentsHorizontalIcon, MapPinIcon } from "@heroicons/vue/24/outline";
import { GERMAN_STATES, isGenericDeviceLocationLabel, type PostcodeCountry, type PostcodeLocation } from "~/utils/eventLocationPreference";

const props = withDefaults(defineProps<{ autoPrompt?: boolean }>(), { autoPrompt: true });
const { t } = useI18n();
const { preference, initialize, save, enrichDevicePlace } = useEventLocationPreference();
const open = ref(false);
const busy = ref(false);
const error = ref("");
const mode = ref<"postcode" | "device" | "state">("postcode");
const country = ref<PostcodeCountry>("DE");
const postcode = ref("");
const radiusKm = ref(50);
const state = ref("Bayern");
const germanStates = GERMAN_STATES;
const modes = [
  { key: "postcode", label: "eventLocation.postcodeTab" },
  { key: "device", label: "eventLocation.deviceTab" },
  { key: "state", label: "eventLocation.stateTab" },
] as const;

const buttonLabel = computed(() => {
  const current = preference.value;
  const place = current?.mode === "nearby"
    ? t("eventLocation.nearbyPlace", { place: current.source === "device"
      ? isGenericDeviceLocationLabel(current.label) ? t("eventLocation.deviceTab") : t("eventLocation.deviceWithPlace", { place: current.label })
      : current.label, radius: current.radiusKm })
    : current?.mode === "state" ? current.state : t("eventLocation.defaultPlace");
  return t("eventLocation.button", { place });
});

onMounted(() => {
  initialize();
  void enrichDevicePlace();
  if (preference.value?.mode === "nearby") {
    mode.value = preference.value.source;
    country.value = preference.value.country;
    radiusKm.value = preference.value.radiusKm;
    if (preference.value.source === "postcode") postcode.value = preference.value.label.split(" ")[0] || "";
  } else if (preference.value?.mode === "state") {
    mode.value = "state";
    state.value = preference.value.state;
  }
  if (props.autoPrompt && !preference.value) open.value = true;
});

function close() {
  if (!preference.value) save({ mode: "default" });
  open.value = false;
  error.value = "";
}

function useDefault() {
  save({ mode: "default" });
  close();
}

async function apply() {
  if (busy.value) return;
  error.value = "";
  if (mode.value === "state") {
    save({ mode: "state", state: state.value });
    close();
    return;
  }
  busy.value = true;
  try {
    if (mode.value === "postcode") {
      const location = await $fetch<PostcodeLocation>("/api/locations/postcode", {
        query: { country: country.value, postcode: postcode.value },
      });
      save({ mode: "nearby", source: "postcode", label: `${location.postcode} ${location.place}`, country: country.value, latitude: location.latitude, longitude: location.longitude, radiusKm: radiusKm.value });
    } else {
      if (!navigator.geolocation) throw new Error("Geolocation unavailable");
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }),
      );
      save({ mode: "nearby", source: "device", label: t("eventLocation.deviceTab"), country: country.value, latitude: Number(position.coords.latitude.toFixed(3)), longitude: Number(position.coords.longitude.toFixed(3)), radiusKm: radiusKm.value });
      void enrichDevicePlace();
    }
    close();
  } catch {
    error.value = t(mode.value === "postcode" ? "eventLocation.postcodeError" : "eventLocation.deviceError");
  } finally {
    busy.value = false;
  }
}
</script>
