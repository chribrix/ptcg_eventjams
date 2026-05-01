<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Events - Admin Dashboard - PTCG Event Jams",
});

navigateTo("/admin/events", {
  redirectCode: 301,
  replace: true,
});
</script>
