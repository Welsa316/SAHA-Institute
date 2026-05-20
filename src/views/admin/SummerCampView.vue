<script setup>
import StudentList from '../../components/admin/StudentList.vue'
</script>

<template>
  <StudentList
    endpoint="/api/summer-camp"
    eyebrow="Roster"
    title="Summer Camp"
    empty-message="No campers on the roster yet. Use Add student to get started."
  />
</template>
