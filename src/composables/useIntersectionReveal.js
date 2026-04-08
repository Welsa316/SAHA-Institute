import { onMounted, onUnmounted, ref } from 'vue'

export function useIntersectionReveal(threshold = 0.2) {
  const sectionRef = ref(null)
  const isVisible = ref(false)
  let observer = null

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            isVisible.value = true
            observer.disconnect()
          }
        })
      },
      { threshold }
    )
    if (sectionRef.value) {
      observer.observe(sectionRef.value)
    }
  })

  onUnmounted(() => {
    if (observer) observer.disconnect()
  })

  return { sectionRef, isVisible }
}
