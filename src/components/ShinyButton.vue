<script setup>
import { useRouter } from 'vue-router'

// Vue 3 port of the React "ShinyButton" — a CTA pill with a slow shimmer sweeping
// diagonally across the label and a thin glowing border.
//
// The original used framer-motion to animate the --x custom property between 100%
// and -100% on a loop. We don't need an animation library for that — pure CSS
// keyframes drive the same shimmer with no JS overhead, and behave correctly when
// the button mounts/unmounts during route changes.
//
// Props:
//   to     — vue-router target. Click navigates there. If omitted the button still
//            fires a `click` event so callers can wire their own handler.
//   label  — display text (also accepts a default slot — slot takes precedence).
//   class  — passed through to the root for sizing/positioning tweaks.

const props = defineProps({
  to: { type: [String, Object], default: null },
  label: { type: String, default: '' },
})

const router = useRouter()

function handleClick(event) {
  if (props.to) {
    event.preventDefault()
    router.push(props.to)
  }
}
</script>

<template>
  <button
    type="button"
    @click="handleClick"
    class="shiny-button group relative rounded-full px-6 py-2.5 font-body font-semibold backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow-lg hover:shadow-academic-500/20 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
  >
    <!-- Label layer. The masked gradient is the "shimmer" — a moving slice of
         brand color that reveals the text. text-academic-700 is the resting
         color; the mask sweeps across the whole label diagonally. -->
    <span class="shiny-label relative block size-full text-[11px] uppercase tracking-[0.18em] text-academic-700">
      <slot>{{ label }}</slot>
    </span>
    <!-- Border layer. content-box + exclude composite carves the inside out so
         only the 1px ring is painted, then a diagonal gradient pulses across it. -->
    <span class="shiny-border absolute inset-0 z-10 block rounded-[inherit] p-px" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
/* `--x` is the value the masks track. Both the label and the border read it,
   so a single keyframe drives both layers in lock-step.
   The variable is registered with @property where supported so the browser
   actually interpolates it (otherwise CSS treats custom properties as discrete
   and the animation jumps between keyframes). */
@property --x {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

.shiny-button {
  --x: 100%;
  /* 3s sweep + 1s pause matches the repeatDelay:1 from the original spring config. */
  animation: shiny-sweep 4s linear infinite;
  /* Brand color sourced from the academic palette via a custom prop so the masks
     can interpolate it. The hex below maps to the `academic-500` Tailwind token —
     a richer SAHA blue, not a generic primary. */
  --shiny-primary: 70 124 168; /* rgb of academic-500 */
}

.shiny-label {
  -webkit-mask-image: linear-gradient(
    -75deg,
    rgb(var(--shiny-primary)) calc(var(--x) + 20%),
    transparent calc(var(--x) + 30%),
    rgb(var(--shiny-primary)) calc(var(--x) + 100%)
  );
  mask-image: linear-gradient(
    -75deg,
    rgb(var(--shiny-primary)) calc(var(--x) + 20%),
    transparent calc(var(--x) + 30%),
    rgb(var(--shiny-primary)) calc(var(--x) + 100%)
  );
}

.shiny-border {
  background: linear-gradient(
    -75deg,
    rgb(var(--shiny-primary) / 15%) calc(var(--x) + 20%),
    rgb(var(--shiny-primary) / 60%) calc(var(--x) + 25%),
    rgb(var(--shiny-primary) / 15%) calc(var(--x) + 100%)
  );
  /* Two-mask composite — paints only the border ring, not the fill. */
  -webkit-mask:
    linear-gradient(#000, #000) content-box,
    linear-gradient(#000, #000);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000, #000) content-box,
    linear-gradient(#000, #000);
  mask-composite: exclude;
}

@keyframes shiny-sweep {
  /* Sweep across, then hold off-screen for the remaining time so the shimmer
     has a beat between sweeps instead of looking like a continuous strobe. */
  0% { --x: 100%; }
  75% { --x: -100%; }
  100% { --x: -100%; }
}

/* Reduce motion: respect the user's OS preference. Falls back to a static
   styled pill — still tappable, still on-brand, no shimmer. */
@media (prefers-reduced-motion: reduce) {
  .shiny-button {
    animation: none;
    --x: 50%;
  }
}
</style>
