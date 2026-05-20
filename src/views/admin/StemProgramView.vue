<script setup>
import StudentList from '../../components/admin/StudentList.vue'
</script>

<template>
  <StudentList
    endpoint="/api/stem-program"
    eyebrow="Roster"
    title="STEM Program"
    subtitle="Students enrolled in the STEM afternoon block — ages 9 to 17. Grouped by grade level."
    empty-message="No STEM students on the roster yet. Use Add student to get started."
  />
</template>
