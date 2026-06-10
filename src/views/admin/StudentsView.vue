<script setup>
import StudentList from '../../components/admin/StudentList.vue'

// Year-round tutoring roster. Rows are created when students register their
// own accounts at /register (name + username + password); new registrations
// wait in the Pending approval queue until a teacher approves them. No manual
// "Add student" button here. Homework management lives in each student's
// detail modal (allow-assignments).
</script>

<template>
  <StudentList
    endpoint="/api/students"
    eyebrow="Roster"
    title="Students"
    show-paid-from
    :allow-add="false"
    allow-assignments
    empty-message="No students yet. Rows will appear here automatically when a student registers an account."
  />
</template>
