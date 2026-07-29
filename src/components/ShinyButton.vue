<script setup>

// SAHA's primary CTA button. Solid amber fill with deep-navy text so it reads
// against both surfaces it has to live on: the dark hero (where the navbar is
// transparent) and the scrolled white navbar. A previous take used a ghost /
// border-only style with academic-blue text — that blended into both contexts.
// This one doesn't.
//
// The "shiny" effect is a fast white sweep across the label plus a tracer pulse
// on the border ring. `--x` is the animated value; both layers read it so the
// sweep stays in lock-step. `@property --x` registers the custom property so
// browsers actually interpolate it — otherwise CSS treats it as discrete and
// the sweep jumps between keyframes instead of gliding.
//
// Props:
//   to     — vue-router target. Click navigates there.
//   label  — display text (also accepts a default slot — slot wins if both set).
//   size   — 'sm' | 'md' | 'lg' (default 'md'). Adjusts padding + text size
//            without changing the shimmer geometry.

const props = defineProps({
  to: { type: [String, Object], default: null },
  label: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

const emit = defineEmits(['click'])

// Emits only. When `to` is set the template's <a> handles navigation via the
// router-link custom slot's navigate() — a caller that calls preventDefault in
// its @click listener suppresses it (used when the CTA opens a modal instead).
function handleClick(event) {
  emit('click', event)
}

const sizeClasses = {
  sm: 'px-5 py-2 text-[10px]',
  md: 'px-7 py-3 text-[11px]',
  lg: 'px-9 py-4 text-[12px]',
}
</script>

<template>
  <!-- With `to`, the CTA renders as a REAL <a href> — search engines can't
       follow a JS-only button, which orphaned /workshops from the nav.
       Navigation stays client-side via navigate(); a listener that calls
       preventDefault still suppresses it, same contract as before. Without
       `to` it stays a true <button> (keyboard + AT semantics intact). -->
  <router-link v-if="to" :to="to" custom v-slot="{ href, navigate }">
    <a
      :href="href"
      @click="(e) => { handleClick(e); if (!e.defaultPrevented) navigate(e) }"
      :class="['shiny-button group', sizeClasses[size]]"
      class="relative inline-block overflow-hidden rounded-full font-body font-bold tracking-[0.18em] uppercase text-navy-950 bg-amber-400 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-300 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 focus:outline-none"
    >
      <span class="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
        <slot>{{ label }}</slot>
      </span>
      <span class="shiny-sweep absolute inset-0 z-[5] pointer-events-none" aria-hidden="true"></span>
      <span class="shiny-border absolute inset-0 z-[6] pointer-events-none rounded-[inherit] p-px" aria-hidden="true"></span>
    </a>
  </router-link>
  <button
    v-else
    type="button"
    @click="handleClick"
    :class="['shiny-button group', sizeClasses[size]]"
    class="relative overflow-hidden rounded-full font-body font-bold tracking-[0.18em] uppercase text-navy-950 bg-amber-400 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:bg-amber-300 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 focus:outline-none"
  >
    <span class="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
      <slot>{{ label }}</slot>
    </span>
    <span class="shiny-sweep absolute inset-0 z-[5] pointer-events-none" aria-hidden="true"></span>
    <span class="shiny-border absolute inset-0 z-[6] pointer-events-none rounded-[inherit] p-px" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
@property --x {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

.shiny-button {
  --x: 100%;
  /* Faster than the previous 4s + 1s pause — the user explicitly asked for
     "shinier", which here means more frequent sweep + brighter highlight. */
  animation: shiny-sweep 2.4s linear infinite;
  /* Amber glow ring so the button reads as a CTA even at rest. Slightly stronger
     on hover for affordance. The keyframe doesn't touch this; it's static. */
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4) inset,
    0 6px 24px -6px rgba(251, 191, 36, 0.55),
    0 2px 6px -2px rgba(0, 0, 0, 0.18);
}

.shiny-button:hover {
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5) inset,
    0 10px 32px -4px rgba(251, 191, 36, 0.7),
    0 3px 8px -2px rgba(0, 0, 0, 0.22);
}

.shiny-sweep {
  background: linear-gradient(
    -75deg,
    transparent calc(var(--x) - 30%),
    rgba(255, 255, 255, 0.85) calc(var(--x) - 5%),
    rgba(255, 255, 255, 0.0) calc(var(--x) + 20%),
    transparent calc(var(--x) + 30%)
  );
  /* mix-blend on amber gives the sweep a pearlescent feel rather than a flat
     white wash — closer to real reflected light. */
  mix-blend-mode: screen;
}

.shiny-border {
  background: linear-gradient(
    -75deg,
    rgba(255, 255, 255, 0.0) calc(var(--x) + 10%),
    rgba(255, 255, 255, 0.95) calc(var(--x) + 25%),
    rgba(255, 255, 255, 0.0) calc(var(--x) + 45%)
  );
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
  0%   { --x: 130%; }
  60%  { --x: -30%; }
  100% { --x: -30%; }
}

@media (prefers-reduced-motion: reduce) {
  .shiny-button {
    animation: none;
    --x: 50%;
  }
  .shiny-sweep,
  .shiny-border {
    opacity: 0;
  }
}
</style>
