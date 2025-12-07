<template>
  <div class="registration-page">
    <div class="container mx-auto px-4 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading event details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <h2>Event Not Found</h2>
        <p>{{ error }}</p>
        <NuxtLink to="/" class="back-button">Back to Events</NuxtLink>
      </div>

      <!-- Event Registration Form -->
      <div v-else-if="event" class="registration-container">
        <!-- Event Header -->
        <div class="event-header">
          <h1>{{ event.name }}</h1>
          <div class="event-meta">
            <div class="meta-item">
              <svg
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              <span>{{ formatEventDate(event.eventDate) }}</span>
            </div>
            <div class="meta-item">
              <svg
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              <span>{{ event.venue }}</span>
            </div>
            <div class="meta-item">
              <svg
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <span
                >{{ registrationCount }}/{{
                  event.maxParticipants
                }}
                registered</span
              >
            </div>
            <div v-if="event.participationFee > 0" class="meta-item">
              <svg
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                ></path>
              </svg>
              <span>€{{ event.participationFee }}</span>
            </div>
            <div v-else class="meta-item free-event">
              <svg
                class="icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <span>Free Event</span>
            </div>
          </div>
        </div>

        <!-- Registration Status Messages -->
        <div v-if="registrationFull" class="status-message error">
          <h3>Event Full</h3>
          <p>
            This event has reached its maximum capacity of
            {{ event.maxParticipants }} participants.
          </p>
        </div>

        <div v-else-if="eventPassed" class="status-message error">
          <h3>Registration Closed</h3>
          <p>This event has already taken place.</p>
        </div>

        <div v-else-if="registrationSuccess" class="status-message success">
          <h3>Registration Successful!</h3>
          <p>
            Player <strong>{{ form.name }}</strong> (ID: {{ form.playerId }})
            has been successfully registered for {{ event.name }}.
          </p>
          <p v-if="event.requiresDecklist" class="redirect-notice">
            <strong>Next step:</strong> You will be redirected to your dashboard
            where you can submit your decklist or choose to bring it on-site.
          </p>
          <p v-else>You will be redirected to your dashboard in a moment.</p>
          <p>A confirmation email will be sent to {{ form.email }}.</p>
        </div>

        <!-- Registration Form -->
        <div v-else class="registration-form">
          <h2>Register for this Event</h2>
          <p class="form-description">
            <span v-if="hasPrefilledData">
              ✓ Your player information has been loaded from your profile.
              Please verify and complete any missing details to register for
              this event.
            </span>
            <span v-else-if="!userLoading">
              Please provide your player information to register for this event.
              Consider updating your profile to auto-fill this form in the
              future.
            </span>
            <span v-else> Loading your profile information... </span>
          </p>
          <form @submit.prevent="submitRegistration">
            <div v-if="userLoading" class="form-loading">
              <div class="spinner-small"></div>
              <p>Loading your information...</p>
            </div>

            <div v-else class="form-grid">
              <div class="form-group">
                <label for="playerId">Player ID *</label>
                <input
                  id="playerId"
                  v-model="form.playerId"
                  type="text"
                  required
                  :disabled="submitting"
                  class="form-input"
                  :class="{ prefilled: form.playerId }"
                  placeholder="Enter your unique player ID"
                />
                <small v-if="form.playerId" class="field-note"
                  >✓ Loaded from your profile</small
                >
              </div>

              <div class="form-group">
                <label for="name">Full Name *</label>
                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  required
                  :disabled="submitting"
                  class="form-input"
                  :class="{ prefilled: form.name }"
                  placeholder="Enter your full name"
                />
                <small v-if="form.name" class="field-note"
                  >✓ Loaded from your profile</small
                >
              </div>

              <div class="form-group">
                <label for="email">Email Address *</label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  required
                  :disabled="submitting"
                  class="form-input"
                  :class="{ prefilled: form.email }"
                  placeholder="Enter your email address"
                />
                <small v-if="form.email" class="field-note"
                  >✓ Loaded from your account</small
                >
              </div>
            </div>

            <!-- Decklist Notification -->
            <div v-if="event.requiresDecklist" class="decklist-notification">
              <div class="notification-content">
                <div class="notification-header">
                  <svg
                    class="notification-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <h3 class="notification-title">Decklist Required</h3>
                </div>
                <p class="notification-text">
                  This event requires a decklist submission. After registration,
                  you'll be able to submit your decklist digitally or choose to
                  bring it on-site in written/printed form.
                </p>
              </div>
            </div>

            <div v-if="formError" class="form-error">
              {{ formError }}
            </div>

            <button
              type="submit"
              :disabled="submitting || !!registrationFull"
              class="submit-button"
            >
              {{ submitting ? "Registering..." : "Register for Event" }}
            </button>
          </form>
        </div>

        <!-- Back to Events Link -->
        <div class="back-link">
          <NuxtLink to="/" class="back-button"
            >← Back to Events Calendar</NuxtLink
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";

interface CustomEvent {
  id: string | number;
  name: string;
  eventDate: string;
  venue: string;
  maxParticipants: number;
  participationFee: number;
  requiresDecklist: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationForm {
  playerId: string;
  name: string;
  email: string;
}

const route = useRoute();
const eventId = route.params.id as string;

// State
const event = ref<CustomEvent | null>(null);
const registrationCount = ref<number>(0);
const loading = ref<boolean>(true);
const error = ref<string>("");
const submitting = ref<boolean>(false);
const registrationSuccess = ref<boolean>(false);
const formError = ref<string>("");

const form = reactive<RegistrationForm>({
  playerId: "",
  name: "",
  email: "",
});

// Supabase user data
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const userLoading = ref<boolean>(true);

// Computed properties
const registrationFull = computed(() => {
  return event.value && registrationCount.value >= event.value.maxParticipants;
});

const eventPassed = computed(() => {
  if (!event.value) return false;
  const eventDate = new Date(event.value.eventDate);
  const now = new Date();
  return eventDate < now;
});

const hasPrefilledData = computed(() => {
  return !userLoading.value && (form.playerId || form.name || form.email);
});

// Methods
const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadUserData = async (): Promise<void> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (user) {
      console.log("User found:", user.email);
      console.log("User metadata:", user.user_metadata);

      if (user.user_metadata) {
        // Prefill form with user metadata
        if (user.user_metadata.playerId) {
          form.playerId = user.user_metadata.playerId;
          console.log("Prefilled playerId:", user.user_metadata.playerId);
        }
        if (user.user_metadata.name) {
          form.name = user.user_metadata.name;
          console.log("Prefilled name:", user.user_metadata.name);
        }
      }

      if (user.email) {
        form.email = user.email;
        console.log("Prefilled email:", user.email);
      }
    } else {
      console.log("No user session found");
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
  } finally {
    userLoading.value = false;
  }
};

const fetchEventDetails = async (): Promise<void> => {
  try {
    loading.value = true;
    error.value = "";

    const response = await $fetch<{
      event: CustomEvent;
      registrationCount: number;
    }>(`/api/events/${eventId}`);

    if (response.event) {
      event.value = response.event;
      registrationCount.value = response.registrationCount || 0;
    } else {
      error.value = "Event not found";
    }
  } catch (err: unknown) {
    console.error("Failed to fetch event:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to load event details";
    error.value = errorMessage;
  } finally {
    loading.value = false;
  }
};

const submitRegistration = async (): Promise<void> => {
  try {
    submitting.value = true;
    formError.value = "";

    const response = await $fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      body: form,
    });

    registrationSuccess.value = true;
    registrationCount.value += 1;

    // Redirect to dashboard after successful registration
    setTimeout(() => {
      navigateTo("/dashboard");
    }, 2000); // Show success message for 2 seconds, then redirect
  } catch (err: unknown) {
    console.error("Registration failed:", err);
    const errorObj = err as { data?: { message?: string }; message?: string };
    formError.value =
      errorObj.data?.message ||
      errorObj.message ||
      "Registration failed. Please try again.";
  } finally {
    submitting.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  // Wait a moment for user auth to load
  await new Promise((resolve) => setTimeout(resolve, 100));

  // If no user is logged in, redirect to login with return URL
  if (!user.value) {
    const returnUrl = encodeURIComponent(`/events/register/${eventId}`);
    await navigateTo(`/login?redirect=${returnUrl}`);
    return;
  }

  await Promise.all([loadUserData(), fetchEventDetails()]);
});

// SEO
useHead({
  title: computed(() =>
    event.value ? `Register - ${event.value.name}` : "Event Registration"
  ),
  meta: [
    {
      name: "description",
      content: computed(() =>
        event.value
          ? `Register for ${event.value.name} at ${event.value.venue}`
          : "Event Registration"
      ),
    },
  ],
});
</script>

<style scoped>
.registration-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 0;
}

.container {
  max-width: 800px;
}

.loading-container,
.error-container {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.registration-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.event-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  color: white;
  padding: 2rem;
}

.event-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.event-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.meta-item.free-event {
  color: #10b981;
  font-weight: 600;
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.status-message {
  padding: 2rem;
  text-align: center;
}

.status-message.success {
  background-color: #f0fdf4;
  border-left: 4px solid #10b981;
  color: #065f46;
}

.status-message.error {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

.redirect-notice {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  font-weight: 500;
}

.status-message h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.registration-form {
  padding: 2rem;
}

.registration-form h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.form-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.form-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  justify-content: center;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.form-input.prefilled {
  background-color: #f0fdf4;
  border-color: #10b981;
}

.field-note {
  color: #059669;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
  font-weight: 500;
}

.form-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.submit-button {
  width: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.submit-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.back-link {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
}

.back-button {
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: #3b82f6;
}

/* Decklist Notification Styles */
.decklist-notification {
  margin: 1.5rem 0;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.notification-content {
  padding: 1.25rem;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.notification-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #d97706;
  flex-shrink: 0;
}

.notification-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
  margin: 0;
}

.notification-text {
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

/* Decklist Section Styles */
.decklist-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
}

.decklist-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.decklist-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.decklist-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.decklist-option {
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background-color: white;
  transition: border-color 0.2s ease;
}

.decklist-option:has(.radio-input:checked) {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.radio-input {
  margin-top: 0.125rem;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.radio-text {
  line-height: 1.4;
}

.decklist-textarea-container {
  margin-top: 1rem;
  padding-left: 1.75rem;
}

.textarea-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.decklist-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: monospace;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.decklist-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.onsite-notice {
  margin-top: 1rem;
  padding-left: 1.75rem;
}

.notice-content {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
}

.notice-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.notice-title {
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.25rem;
}

.notice-text {
  color: #92400e;
  font-size: 0.875rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .event-header h1 {
    font-size: 2rem;
  }

  .event-meta {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .decklist-options {
    gap: 1rem;
  }

  .decklist-option {
    padding: 0.75rem;
  }

  .decklist-textarea-container,
  .onsite-notice {
    padding-left: 1rem;
  }
}
</style>
