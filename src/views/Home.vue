<script setup>
import Hero from '../components/Hero.vue'
import Intro from '../components/Intro.vue'
import Programs from '../components/Programs.vue'
import WhySaha from '../components/WhySaha.vue'
import CallToAction from '../components/CallToAction.vue'

// Events.vue (the Summer Camp teaser block) used to live here. It moved to the
// /enroll page so the homepage stays focused on year-round programs and the
// Enroll CTA in the nav is the one path that surfaces summer + workshops.
// The component file is intentionally left in src/components/ in case we want
// to revive it later.
</script>

<template>
  <Hero />
  <Intro />
  <Programs />
  <WhySaha />
  <CallToAction />
</template>
