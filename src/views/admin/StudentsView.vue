<script setup>
import StudentList from '../../components/admin/StudentList.vue'

// Year-round tutoring roster. Rows are created when students register their
// own accounts at /register (student name + parent email + parent phone +
// password); new registrations wait in the Pending approval queue until a
// teacher verifies the family and approves. No payment tracking here —
// tutoring payments are handled off-platform. Homework management lives in
// each student's detail modal.
</script>

<template>
  <StudentList
    endpoint="/api/students"
    eyebrow="Roster"
    title="Students"
    allow-assignments
    empty-message="No students yet. Rows will appear here automatically when a student registers an account."
  />
</template>
