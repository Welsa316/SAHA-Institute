import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { useAdminAuth } from '../composables/useAdminAuth.js'

const BASE_TITLE = 'SAHA Institute For Learning'
const BASE_DESC = 'One-on-one tutoring in academics, Islamic studies, and standardized test prep for ages 4 to 17.'

const routes = [
  // ---------- Public site ----------
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: `${BASE_TITLE} | One-on-One Tutoring in Kenner, LA`,
      description: BASE_DESC,
    },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
    meta: {
      title: `About | ${BASE_TITLE}`,
      description: 'Meet the team behind SAHA Institute and read the story of how a substitute teacher built a learning center serving 200+ students.',
    },
  },
  {
    path: '/summer-camp',
    name: 'SummerCamp',
    component: () => import('../views/SummerCamp.vue'),
    meta: {
      title: `Summer Camp & STEM 2026 | ${BASE_TITLE}`,
      description: 'Full-month summer camp June 1-30 for ages 4-17. STEM block for ages 9-17. Daily schedule, weekly lunch menus, and pricing.',
    },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/SignupView.vue'),
    meta: {
      title: `Workshop Signup | ${BASE_TITLE}`,
      description: 'Sign your student up for SAHA Institute workshops. Mrs. Anila will follow up to confirm.',
    },
  },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('../views/Contact.vue'),
    meta: {
      title: `Contact | ${BASE_TITLE}`,
      description: 'Get in touch with SAHA Institute. Call (504) 667-3625 or send a message — we typically respond within 24 hours.',
    },
  },

  // ---------- Admin ----------
  // Every /admin route renders inside the AdminLayout, which provides the sidebar.
  // The `admin: true` meta flag tells App.vue to hide the public Navbar / Footer /
  // floating widgets. The `requiresAuth` flag is enforced by beforeEach below.
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/admin/LoginView.vue'),
    meta: {
      admin: true,
      title: `Admin Login | ${BASE_TITLE}`,
      noindex: true,
    },
  },
  {
    path: '/admin',
    component: () => import('../components/admin/AdminLayout.vue'),
    meta: { admin: true, requiresAuth: true, noindex: true },
    redirect: '/admin/workshop-signups',
    children: [
      {
        path: 'workshop-signups',
        name: 'AdminWorkshopSignups',
        component: () => import('../views/admin/WorkshopSignupsView.vue'),
        meta: { admin: true, requiresAuth: true, title: `Workshop Signups | ${BASE_TITLE}` },
      },
      {
        path: 'summer-camp',
        name: 'AdminSummerCamp',
        component: () => import('../views/admin/SummerCampView.vue'),
        meta: { admin: true, requiresAuth: true, title: `Summer Camp | ${BASE_TITLE}` },
      },
      {
        path: 'stem-program',
        name: 'AdminStemProgram',
        component: () => import('../views/admin/StemProgramView.vue'),
        meta: { admin: true, requiresAuth: true, title: `STEM Program | ${BASE_TITLE}` },
      },
      {
        path: 'students',
        name: 'AdminStudents',
        component: () => import('../views/admin/StudentsView.vue'),
        meta: { admin: true, requiresAuth: true, title: `Students | ${BASE_TITLE}` },
      },
      {
        path: 'payments',
        name: 'AdminPayments',
        component: () => import('../views/admin/PaymentsView.vue'),
        meta: { admin: true, requiresAuth: true, title: `Payments | ${BASE_TITLE}` },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

// Auth guard for /admin/* (except /admin/login).
// We hit /api/auth/me only once per session — `ensureChecked` is a no-op after first call.
router.beforeEach(async (to) => {
  if (!to.meta?.requiresAuth) return true

  const { isAuthenticated, ensureChecked } = useAdminAuth()
  await ensureChecked()
  if (!isAuthenticated.value) {
    return { name: 'AdminLogin', query: { next: to.fullPath } }
  }
  return true
})

// Title + description sync on route change.
router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
  if (to.meta?.description) {
    let desc = document.querySelector('meta[name="description"]')
    if (!desc) {
      desc = document.createElement('meta')
      desc.setAttribute('name', 'description')
      document.head.appendChild(desc)
    }
    desc.setAttribute('content', to.meta.description)
  }
  // Admin routes shouldn't be indexed.
  let robots = document.querySelector('meta[name="robots"]')
  if (to.meta?.noindex) {
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'noindex, nofollow')
  } else if (robots) {
    robots.remove()
  }
})

export default router
