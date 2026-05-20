<script setup>
import StudentList from '../../components/admin/StudentList.vue'
</script>

<template>
  <StudentList
    endpoint="/api/students"
    eyebrow="Roster"
    title="Students"
    show-paid-from
    empty-message="No students enrolled yet. Use Add student to start the master roster."
  />
</template>
