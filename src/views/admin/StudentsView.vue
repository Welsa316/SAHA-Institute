<script setup>
import StudentList from '../../components/admin/StudentList.vue'

// Year-round tutoring roster. Admins register families here with "Register
// family" (student name(s) + parent email + optional parent phone +
// password); those rows are approved on creation, and the family logs in at
// /login with the email + password the admin shares. Teachers then enroll
// students into classes from the Schedule tab. Tutoring payments themselves
// are still handled off-platform, but each student's detail modal carries the
// payment REMINDER cycle (a billing start date + cadence) so parents get
// emailed before each payment is due. Homework management lives there too.
</script>

<template>
  <StudentList
    endpoint="/api/students"
    eyebrow="Roster"
    title="Students"
    allow-assignments
    allow-register
    allow-billing-reminders
    empty-message="No students yet. Use Register family to add the first one."
  />
</template>
