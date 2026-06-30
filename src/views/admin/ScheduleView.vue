<script setup>
import { useAdminAuth } from '../../composables/useAdminAuth.js'

// Placeholder — the weekly calendar grid, scheduling form, and cancel actions
// are built in the Schedule-tab UI task. Routing + role gating are live now.
const { isAdmin } = useAdminAuth()
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 md:px-10 py-10">
    <h1 class="font-heading text-3xl md:text-4xl font-extrabold text-navy-900 tracking-tight mb-2">Schedule</h1>
    <p class="font-body text-navy-500">
      {{ isAdmin ? 'Weekly master calendar across all teachers.' : 'Your weekly calendar.' }}
    </p>
  </div>
</template>
