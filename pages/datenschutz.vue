<template><LegalDocument slug="datenschutz" v-bind="document" /></template>
<script setup lang="ts">
useHead({ title: "Datenschutzerklärung – ChrispyJams" });
const { data } = await useFetch("/api/legal/datenschutz");
const document = computed(() => data.value || { published: false, operatorName: "", operatorAddress: "", operatorEmail: "", operatorContact: "", body: "" });
</script>
