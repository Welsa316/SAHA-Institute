<script setup>
import StudentList from '../../components/admin/StudentList.vue'
</script>

<template>
  <StudentList
    endpoint="/api/summer-camp"
    eyebrow="Roster"
    title="Summer Camp"
    subtitle="Students enrolled in the full-month June camp. Grouped by grade level — add anyone Mrs. Anila signs up off-channel."
    empty-message="No campers on the roster yet. Use Add student to get started."
  />
</template>
