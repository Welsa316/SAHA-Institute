<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import Navbar from './components/Navbar.vue'
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
    <Navbar :scrollY="scrollY" />
    <router-view />
    <Footer />
  </div>
</template>
