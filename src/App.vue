<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import Intro from './components/Intro.vue'
import Programs from './components/Programs.vue'
import WhySaha from './components/WhySaha.vue'
import CallToAction from './components/CallToAction.vue'
import Footer from './components/Footer.vue'

const scrollY = ref(0)

function handleScroll() {
  scrollY.value = window.scrollY
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Subtle background pattern -->
    <div class="fixed inset-0 pointer-events-none opacity-[0.015]"
         style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cline x1=&quot;0&quot; y1=&quot;30&quot; x2=&quot;60&quot; y2=&quot;30&quot; stroke=&quot;%231a2b55&quot; stroke-width=&quot;0.5&quot;/%3E%3C/svg%3E'); background-size: 60px 60px;">
    </div>

    <Navbar :scrollY="scrollY" />
    <Hero />
    <Intro />
    <Programs />
    <WhySaha />
    <CallToAction />
    <Footer />
  </div>
</template>
