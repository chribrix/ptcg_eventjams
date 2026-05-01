<script setup lang="ts">
definePageMeta({
  layout: "default",
});

navigateTo("/admin/events", {
  redirectCode: 301,
  replace: true,
});
</script>
