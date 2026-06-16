<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAdminAuth } from '../../composables/useAdminAuth.js'

const router = useRouter()
const { user, logout } = useAdminAuth()

// On mobile the sidebar collapses to an off-canvas drawer.
const mobileNavOpen = ref(false)

const navItems = [
  {
    to: '/admin/workshop-signups',
    label: 'Workshop Signups',
    icon: 'clipboard',
  },
  {
    to: '/admin/summer-camp',
    label: 'Summer Camp',
    icon: 'sun',
  },
  {
    to: '/admin/stem-program',
    label: 'STEM Program',
    icon: 'beaker',
  },
  {
    to: '/admin/students',
    label: 'Students',
    icon: 'users',
  },
  {
    to: '/admin/payments',
    label: 'Payments',
    icon: 'card',
  },
]

async function handleLogout() {
  await logout()
  router.push({ name: 'AdminLogin' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-navy-900">
    <!-- Sidebar — fixed on desktop, slide-over on mobile -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 bg-[#001B3D] text-white flex-col py-8 px-5 transition-transform duration-300 md:flex"
      :class="mobileNavOpen ? 'flex translate-x-0' : 'flex -translate-x-full md:translate-x-0'"
    >
      <div class="mb-10">
        <!-- The public site's wordmark is the brand; the admin sidebar mirrors that
             instead of typesetting "SAHA" on its own. Image is white-trimmed and reads
             on the navy background. -->
        <img
          src="/logo.svg"
          alt="SAHA Institute For Learning"
          class="h-10 w-auto brightness-0 invert opacity-95"
          width="1806"
          height="594"
        />
        <p class="font-body text-[10px] tracking-[0.25em] uppercase text-white/40 font-medium mt-3">
          Admin Portal
        </p>
      </div>

      <nav class="flex-1 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
          active-class="bg-academic-500/20 text-white border border-academic-400/30"
          :class="$route.path === item.to ? '' : 'text-white/60 hover:bg-white/[0.06] hover:text-white border border-transparent'"
          @click="mobileNavOpen = false"
        >
          <!-- Icons drawn inline so we don't need an icon library. -->
          <svg v-if="item.icon === 'clipboard'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 2.25h6m-6 0a1.5 1.5 0 00-1.5 1.5v.75h9V3.75a1.5 1.5 0 00-1.5-1.5m-6 0c-.621 0-1.125.504-1.125 1.125v1.125H7.5m9-3v.75M7.5 5.25H6.75A2.25 2.25 0 004.5 7.5v12a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-12a2.25 2.25 0 00-2.25-2.25H16.5" />
          </svg>
          <svg v-if="item.icon === 'sun'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v2.25m6.364 1.386l-1.591 1.591M21 12h-2.25m-1.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
          <svg v-if="item.icon === 'beaker'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M5 14.5l-1.456 2.186A1.5 1.5 0 004.788 19h14.424a1.5 1.5 0 001.244-2.314L19 14.5" />
          </svg>
          <svg v-if="item.icon === 'users'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <svg v-if="item.icon === 'card'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 8.25h19.5M2.25 9V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25V9m-19.5 0v8.25A2.25 2.25 0 004.5 19.5h15a2.25 2.25 0 002.25-2.25V9m-19.5 0h19.5" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="pt-6 mt-6 border-t border-white/[0.08]">
        <p class="font-body text-[10px] tracking-[0.2em] uppercase text-white/40 font-bold mb-2">Signed in as</p>
        <p class="font-body text-sm text-white/80 truncate mb-4">{{ user?.email ?? '—' }}</p>
        <button
          type="button"
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-white/80 hover:bg-white/[0.06] hover:text-white font-body text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Log out
        </button>
      </div>
    </aside>

    <!-- Mobile sidebar backdrop -->
    <div
      v-if="mobileNavOpen"
      @click="mobileNavOpen = false"
      class="fixed inset-0 bg-black/40 z-30 md:hidden"
    ></div>

    <!-- Main content area, offset for the sidebar on md+ -->
    <div class="md:ml-64 min-h-screen flex flex-col">
      <!-- Mobile top bar with hamburger -->
      <div class="md:hidden sticky top-0 z-20 bg-white border-b border-navy-100 px-4 py-3 flex items-center justify-between">
        <button
          @click="mobileNavOpen = !mobileNavOpen"
          aria-label="Open menu"
          class="p-2 rounded-lg hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-academic-400 focus:outline-none"
        >
          <svg class="w-5 h-5 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
        <img
          src="/logo.svg"
          alt="SAHA Institute For Learning"
          class="h-7 w-auto"
          width="1806"
          height="594"
        />
        <span class="w-9" /> <!-- spacer to balance the hamburger -->
      </div>

      <RouterView />
    </div>
  </div>
</template>
