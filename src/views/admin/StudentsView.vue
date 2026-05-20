<script setup>
import StudentList from '../../components/admin/StudentList.vue'

// Year-round tutoring roster. No manual "Add student" button here — rows are
// created automatically when a parent registers a child (student-account flow
// is out of scope for the current admin pass; see NEXT-STEPS.md). Anila gets
// a read + edit interface so she can manage billing on the rows that show up.
</script>

<template>
  <StudentList
    endpoint="/api/students"
    eyebrow="Roster"
    title="Students"
    show-paid-from
    :allow-add="false"
    empty-message="No students yet. Rows will appear here automatically once a parent registers their student."
  />
</template>
