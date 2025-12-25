<template>
  <AdminPageLayout>
    <div class="tags-admin">
      <div class="page-header">
        <h1 class="page-title">Tag Management</h1>
        <p class="page-subtitle">Manage event tags and categorization system</p>
      </div>

      <!-- Tag Type Overview -->
      <div class="admin-card">
        <h2 class="section-title">Tag Types</h2>
        <div class="tag-types-grid">
          <div
            v-for="tagType in tagTypes"
            :key="tagType.value"
            class="tag-type-card"
            :class="{ active: selectedTagType === tagType.value }"
            @click="selectedTagType = tagType.value"
          >
            <h3 class="tag-type-name">{{ tagType.label }}</h3>
            <p class="tag-type-description">{{ tagType.description }}</p>
            <div class="tag-type-count">
              {{ getEventCountByTagType(tagType.value) }} events
            </div>
          </div>
        </div>
      </div>

      <!-- Tag Schema Reference -->
      <div class="admin-card">
        <h2 class="section-title">{{ selectedTagTypeName }} Tag Schema</h2>
        <div class="schema-info">
          <p class="schema-description">
            {{ getTagTypeDescription(selectedTagType) }}
          </p>

          <div class="schema-fields">
            <h3>Available Fields:</h3>
            <div class="field-list">
              <div
                v-for="field in getSchemaFields(selectedTagType)"
                :key="field.name"
                class="field-item"
              >
                <div class="field-header">
                  <span class="field-name">{{ field.name }}</span>
                  <span class="field-type">{{ field.type }}</span>
                  <span v-if="field.required" class="field-required"
                    >Required</span
                  >
                </div>
                <p class="field-description">{{ field.description }}</p>
                <div v-if="field.options" class="field-options">
                  <strong>Options:</strong>
                  <span
                    v-for="option in field.options"
                    :key="option"
                    class="option-badge"
                  >
                    {{ option }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tag Usage Statistics -->
      <div class="admin-card">
        <h2 class="section-title">Tag Display Configuration</h2>
        <p class="config-description">
          Choose which tags to display on events for each tag type. Selected
          tags will be shown as badges on event listings.
        </p>

        <div class="tag-config-section">
          <div
            v-for="tagType in tagTypes"
            :key="tagType.value"
            class="config-group"
          >
            <h3 class="config-group-title">{{ tagType.label }} Events</h3>
            <div class="tag-checkboxes">
              <label class="tag-checkbox-item always-shown">
                <input type="checkbox" checked disabled />
                <span class="checkbox-label">
                  <strong>Game</strong>
                  <span class="checkbox-help">(Always shown)</span>
                </span>
              </label>

              <label
                v-for="field in getConfigurableFields(tagType.value)"
                :key="field.name"
                class="tag-checkbox-item"
              >
                <input
                  type="checkbox"
                  :checked="isFieldEnabled(tagType.value, field.name)"
                  @change="toggleField(tagType.value, field.name)"
                />
                <span class="checkbox-label">
                  <strong>{{ field.label }}</strong>
                  <span class="checkbox-help">{{ field.description }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Tag Usage Statistics -->
      <div class="admin-card">
        <h2 class="section-title">Tag Usage Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalEvents }}</div>
            <div class="stat-label">Total Events</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ uniqueEventTypes }}</div>
            <div class="stat-label">Unique Event Types</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ uniqueGames }}</div>
            <div class="stat-label">Different Games</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ uniqueHosts }}</div>
            <div class="stat-label">Host Organizations</div>
          </div>
        </div>
      </div>

      <!-- Most Used Tags -->
      <div class="admin-card">
        <h2 class="section-title">Most Used Tags</h2>
        <div class="tags-usage-grid">
          <div class="tag-category">
            <h3>Event Types</h3>
            <div class="tag-list">
              <div
                v-for="tag in topEventTypes"
                :key="tag.name"
                class="tag-usage-item"
              >
                <span class="tag-name">{{ getEventTypeLabel(tag.name) }}</span>
                <span class="tag-count">{{ tag.count }}</span>
              </div>
            </div>
          </div>

          <div class="tag-category">
            <h3>Games</h3>
            <div class="tag-list">
              <div
                v-for="tag in topGames"
                :key="tag.name"
                class="tag-usage-item"
              >
                <span class="tag-name">{{ tag.name }}</span>
                <span class="tag-count">{{ tag.count }}</span>
              </div>
            </div>
          </div>

          <div class="tag-category">
            <h3>Formats</h3>
            <div class="tag-list">
              <div
                v-for="tag in topFormats"
                :key="tag.name"
                class="tag-usage-item"
              >
                <span class="tag-name">{{ tag.name }}</span>
                <span class="tag-count">{{ tag.count }}</span>
              </div>
            </div>
          </div>

          <div class="tag-category">
            <h3>Hosts</h3>
            <div class="tag-list">
              <div
                v-for="tag in topHosts"
                :key="tag.name"
                class="tag-usage-item"
              >
                <span class="tag-name">{{ tag.name }}</span>
                <span class="tag-count">{{ tag.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminPageLayout>
</template>

<script setup lang="ts">
import {
  parseEventTags,
  getEventTypeLabel,
  type TagType,
  type PokemonEventTags,
} from "~/types/eventTags";

interface CustomEvent {
  id: string;
  tagType: string;
  tags: any;
}

const selectedTagType = ref<TagType>("pokemon");

const tagTypes = [
  {
    value: "pokemon" as TagType,
    label: "Pokémon TCG",
    description: "Pokémon Trading Card Game events with official formats",
  },
  {
    value: "riftbound" as TagType,
    label: "Riftbound",
    description: "Riftbound card game events",
  },
  {
    value: "generic" as TagType,
    label: "Generic",
    description: "Generic events without specific game restrictions",
  },
];

const selectedTagTypeName = computed(() => {
  return tagTypes.find((t) => t.value === selectedTagType.value)?.label || "";
});

// Tag display configuration
const tagDisplayConfig = ref<Record<TagType, string[]>>({
  pokemon: ["type", "format"], // Default: show type and format for Pokemon
  riftbound: ["type"],
  generic: ["type"],
});

// Load config from localStorage
onMounted(() => {
  const savedConfig = localStorage.getItem("tagDisplayConfig");
  if (savedConfig) {
    try {
      tagDisplayConfig.value = JSON.parse(savedConfig);
    } catch (e) {
      console.error("Failed to load tag config:", e);
    }
  }
  loadEvents();
});

// Save config to localStorage
const saveConfig = () => {
  localStorage.setItem(
    "tagDisplayConfig",
    JSON.stringify(tagDisplayConfig.value)
  );
};

// Check if a field is enabled
const isFieldEnabled = (tagType: TagType, fieldName: string): boolean => {
  return tagDisplayConfig.value[tagType]?.includes(fieldName) || false;
};

// Toggle field visibility
const toggleField = (tagType: TagType, fieldName: string) => {
  if (!tagDisplayConfig.value[tagType]) {
    tagDisplayConfig.value[tagType] = [];
  }

  const index = tagDisplayConfig.value[tagType].indexOf(fieldName);
  if (index > -1) {
    tagDisplayConfig.value[tagType].splice(index, 1);
  } else {
    tagDisplayConfig.value[tagType].push(fieldName);
  }

  saveConfig();
};

// Get configurable fields for a tag type
const getConfigurableFields = (tagType: TagType) => {
  const fields = {
    pokemon: [
      {
        name: "type",
        label: "Event Type",
        description: "League Cup, Challenge, etc.",
      },
      {
        name: "format",
        label: "Format",
        description: "Standard, Expanded, etc.",
      },
      { name: "host", label: "Host", description: "Hosting organization" },
    ],
    riftbound: [
      { name: "type", label: "Event Type", description: "Tournament type" },
      { name: "host", label: "Host", description: "Hosting organization" },
    ],
    generic: [
      { name: "type", label: "Event Type", description: "Event category" },
      { name: "host", label: "Host", description: "Hosting organization" },
    ],
  };
  return fields[tagType] || [];
};

// Fetch events data
const events = ref<CustomEvent[]>([]);
const loading = ref(true);

const loadEvents = async () => {
  try {
    loading.value = true;
    const response = await $fetch<{ events: CustomEvent[] }>(
      "/api/admin/events/combined"
    );
    events.value = response.events || [];
  } catch (error) {
    console.error("Error loading events:", error);
  } finally {
    loading.value = false;
  }
};

// Computed statistics
const totalEvents = computed(() => events.value.length);

const uniqueEventTypes = computed(() => {
  const types = new Set();
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.type) types.add(tags.type);
  });
  return types.size;
});

const uniqueGames = computed(() => {
  const games = new Set();
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.game) games.add(tags.game);
  });
  return games.size;
});

const uniqueHosts = computed(() => {
  const hosts = new Set();
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.host) hosts.add(tags.host);
  });
  return hosts.size;
});

const getEventCountByTagType = (tagType: TagType) => {
  return events.value.filter((e) => e.tagType === tagType).length;
};

// Top tags
const topEventTypes = computed(() => {
  const counts: Record<string, number> = {};
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.type) {
      counts[tags.type] = (counts[tags.type] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

const topGames = computed(() => {
  const counts: Record<string, number> = {};
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.game) {
      counts[tags.game] = (counts[tags.game] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

const topFormats = computed(() => {
  const counts: Record<string, number> = {};
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.format) {
      counts[tags.format] = (counts[tags.format] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

const topHosts = computed(() => {
  const counts: Record<string, number> = {};
  events.value.forEach((event) => {
    const tags = parseEventTags(event.tags, event.tagType as TagType);
    if (tags.host) {
      counts[tags.host] = (counts[tags.host] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

// Schema helpers
const getTagTypeDescription = (tagType: TagType) => {
  const descriptions = {
    pokemon:
      "Pokémon TCG uses a structured tag system with predefined event types (League Cup, League Challenge, etc.) and formats (Standard, Expanded, etc.).",
    riftbound:
      "Riftbound events use a flexible tag system suitable for the Riftbound card game.",
    generic:
      "Generic events support custom tags for any type of event without specific game constraints.",
  };
  return descriptions[tagType];
};

const getSchemaFields = (tagType: TagType) => {
  if (tagType === "pokemon") {
    return [
      {
        name: "type",
        type: "string",
        required: false,
        description: "The specific type of Pokémon event",
        options: [
          "league_cup",
          "league_challenge",
          "prerelease",
          "local_tournament",
          "regional",
          "international",
          "worlds",
          "custom",
        ],
      },
      {
        name: "game",
        type: "string",
        required: true,
        description: "The game being played (always 'Pokemon' for this type)",
      },
      {
        name: "format",
        type: "string",
        required: false,
        description: "The tournament format",
        options: ["standard", "expanded", "unlimited", "theme_deck"],
      },
      {
        name: "host",
        type: "string",
        required: false,
        description: "The organization or league hosting the event",
      },
    ];
  } else if (tagType === "riftbound") {
    return [
      {
        name: "game",
        type: "string",
        required: true,
        description: "The game being played (typically 'Riftbound')",
      },
      {
        name: "host",
        type: "string",
        required: false,
        description: "The organization hosting the event",
      },
    ];
  } else {
    return [
      {
        name: "game",
        type: "string",
        required: false,
        description: "The game or activity",
      },
      {
        name: "host",
        type: "string",
        required: false,
        description: "The organization hosting the event",
      },
    ];
  }
};
</script>

<style scoped>
.tags-admin {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.admin-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

/* Tag Types Grid */
.tag-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.tag-type-card {
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-type-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
}

.tag-type-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.tag-type-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.tag-type-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.tag-type-count {
  font-weight: 600;
  color: #3b82f6;
}

/* Schema Info */
.schema-info {
  color: #4b5563;
}

.schema-description {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border-left: 4px solid #3b82f6;
}

.schema-fields h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #f9fafb;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.field-name {
  font-weight: 600;
  color: #1f2937;
  font-family: monospace;
}

.field-type {
  font-size: 0.875rem;
  color: #6b7280;
  font-family: monospace;
}

.field-required {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: #fef3c7;
  color: #92400e;
  border-radius: 0.25rem;
  font-weight: 500;
}

.field-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.field-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
}

.option-badge {
  padding: 0.25rem 0.625rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Tag Display Configuration */
.config-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 0.375rem;
  border-left: 4px solid #3b82f6;
}

.tag-config-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-group {
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;
}

.config-group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.tag-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tag-checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-checkbox-item:hover:not(.always-shown) {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.tag-checkbox-item.always-shown {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f9fafb;
}

.tag-checkbox-item input[type="checkbox"] {
  margin-top: 0.125rem;
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

.tag-checkbox-item.always-shown input[type="checkbox"] {
  cursor: not-allowed;
}

.checkbox-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.checkbox-label strong {
  color: #1f2937;
  font-size: 0.9375rem;
}

.checkbox-help {
  color: #6b7280;
  font-size: 0.8125rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0.5rem;
  color: white;
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.9;
}

/* Tags Usage */
.tags-usage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.tag-category h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tag-usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.tag-name {
  font-weight: 500;
  color: #374151;
}

.tag-count {
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.875rem;
}
</style>
