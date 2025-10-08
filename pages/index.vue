<template>
  <div class="home-page">
    <div class="content-wrapper">
      <div class="left-section">
        <div class="hero-section">
          <h1 class="hero-title">Pokemon TCG Event Jams</h1>
          <p class="hero-subtitle">Find Pokemon TCG events in your area</p>

          <div class="features">
            <div class="feature">
              <h3>🗓️ Event Calendar</h3>
              <p>Browse events by date with our interactive calendar view</p>
            </div>
            <div class="feature">
              <h3>📍 Local Events</h3>
              <p>
                Find Pokemon TCG tournaments, league cups, and challenges near
                you
              </p>
            </div>
            <div class="feature">
              <h3>⚡ Real-time Updates</h3>
              <p>
                Get the latest event information directly from official sources
              </p>
            </div>
          </div>

          <div class="hero-actions">
            <NuxtLink to="/events" class="btn btn-primary">
              Full Event View
            </NuxtLink>
            <NuxtLink to="/eventlist" class="btn btn-secondary">
              List View
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="right-section">
        <div class="calendar-section">
          <h2 class="calendar-title">Event Calendar</h2>
          <EventCalendar />
        </div>
      </div>
    </div>
  </div>
</template>

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

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.content-wrapper {
  display: flex;
  min-height: calc(100vh - 4rem);
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.left-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.hero-section {
  text-align: center;
  color: white;
  max-width: 500px;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 3rem;
  opacity: 0.9;
}

.features {
  text-align: left;
  margin-bottom: 3rem;
}

.feature {
  margin-bottom: 2rem;
}

.feature h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.feature p {
  opacity: 0.8;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.calendar-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.calendar-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.btn {
  padding: 0.75rem 2rem;
  text-decoration: none;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-block;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

@media (max-width: 1024px) {
  .content-wrapper {
    flex-direction: column;
    gap: 1.5rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .features {
    margin-bottom: 2rem;
  }
}

@media (max-width: 768px) {
  .home-page {
    padding: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 200px;
  }

  .right-section {
    padding: 1rem;
  }
}
</style>
