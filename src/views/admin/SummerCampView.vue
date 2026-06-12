<script setup>
import CampRoster from '../../components/admin/CampRoster.vue'
</script>

<template>
  <CampRoster
    endpoint="/api/summer-camp"
    eyebrow="Roster"
    title="Summer Camp"
    empty-message="No campers on the roster yet. Use Add student to get started."
  />
</template>
