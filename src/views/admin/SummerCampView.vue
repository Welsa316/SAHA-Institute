<script setup>
import CampRoster from '../../components/admin/CampRoster.vue'
</script>

<template>
  <CampRoster
    endpoint="/api/summer-camp"
    eyebrow="Archive"
    title="Summer Camp 2026"
    subtitle="Enrollment is closed — this roster is kept as the record of everyone who attended the June 2026 camp."
    empty-message="No campers on this roster."
    archived
  />
</template>
