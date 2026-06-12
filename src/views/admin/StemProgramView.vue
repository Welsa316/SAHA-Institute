<script setup>
import CampRoster from '../../components/admin/CampRoster.vue'
</script>

<template>
  <CampRoster
    endpoint="/api/stem-program"
    eyebrow="Roster"
    title="STEM Program"
    empty-message="No STEM students on the roster yet. Use Add student to get started."
  />
</template>
