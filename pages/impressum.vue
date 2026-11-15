<template><LegalDocument slug="impressum" v-bind="document" /></template>
<script setup lang="ts">
useHead({ title: "Impressum – ChrispyJams" });
const { data } = await useFetch("/api/legal/impressum");
const document = computed(() => data.value || { published: false, operatorName: "", operatorAddress: "", operatorEmail: "", operatorContact: "", body: "" });
</script>
