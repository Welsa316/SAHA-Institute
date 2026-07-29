<script setup>
import Hero from '../components/Hero.vue'
import Intro from '../components/Intro.vue'
import Programs from '../components/Programs.vue'
import CampRecapTeaser from '../components/CampRecapTeaser.vue'
import WhySaha from '../components/WhySaha.vue'
import FaqSection from '../components/FaqSection.vue'
import CallToAction from '../components/CallToAction.vue'

// CampRecapTeaser replaced the old Events promo block: camp 2026 is over, so
// instead of a signup pitch the homepage shows a photo-strip teaser linking to
// the /summer-camp recap — visibility for the camp without burying the
// year-round tutoring content it sits between.
</script>

<template>
  <Hero />
  <Intro />
  <Programs />
  <CampRecapTeaser />
  <WhySaha />
  <FaqSection />
  <CallToAction />
</template>
