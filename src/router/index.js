import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { useAdminAuth } from '../composables/useAdminAuth.js'
import { useStudentAuth } from '../composables/useStudentAuth.js'

const BASE_TITLE = 'SAHA Institute For Learning'
const BASE_DESC = 'One-on-one tutoring in academics, Islamic studies, and standardized test prep for ages 4 to 17.'
const SITE_ORIGIN = 'https://sahainstituteforlearning.com'

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
    path: '/enroll',
    name: 'Enroll',
    component: () => import('../views/EnrollView.vue'),
    meta: {
      title: `Enroll | ${BASE_TITLE}`,
      description: 'Enroll your student in SAHA Institute summer camp, STEM, or workshops. Online workshop signup, phone enrollment for summer programs.',
    },
  },
  // /signup is the old standalone workshop-signup URL. The form moved into a
  // modal on /enroll so we redirect there with ?signup=1, which EnrollView reads
  // on mount to auto-open the modal — keeps any old bookmarks landing in the form.
  {
    path: '/signup',
    redirect: { name: 'Enroll', query: { signup: '1' } },
  },

  // ---------- Student accounts (self-service) ----------
  // /register + /login share one component (mode keyed off route name).
  // /portal is the logged-in view, guarded by the student session.
  // `bare: true` hides the public Navbar/Footer (full-screen flows).
  {
    path: '/register',
    name: 'StudentRegister',
    component: () => import('../views/StudentAuthView.vue'),
    meta: {
      bare: true,
      title: `Create a Student Account | ${BASE_TITLE}`,
      description: 'Create a SAHA Institute student account to register for one-on-one tutoring.',
    },
  },
  {
    path: '/login',
    name: 'StudentLogin',
    component: () => import('../views/StudentAuthView.vue'),
    meta: {
      bare: true,
      title: `Log In | ${BASE_TITLE}`,
      noindex: true,
    },
  },
  {
    path: '/portal',
    name: 'StudentPortal',
    component: () => import('../views/StudentPortalView.vue'),
    meta: {
      bare: true,
      requiresStudentAuth: true,
      title: `My Account | ${BASE_TITLE}`,
      noindex: true,
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

// Auth guards. Admin routes check the admin session; the student portal checks
// the (separate) student session. Each hits its /me endpoint once per session —
// `ensureChecked` is a no-op after the first call.
router.beforeEach(async (to) => {
  if (to.meta?.requiresAuth) {
    const { isAuthenticated, ensureChecked } = useAdminAuth()
    await ensureChecked()
    if (!isAuthenticated.value) {
      return { name: 'AdminLogin', query: { next: to.fullPath } }
    }
  }

  if (to.meta?.requiresStudentAuth) {
    const { isAuthenticated, ensureChecked } = useStudentAuth()
    await ensureChecked()
    if (!isAuthenticated.value) {
      return { name: 'StudentLogin', query: { next: to.fullPath } }
    }
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
  // Keep canonical + og:url on the actual route. index.html hardcodes the
  // homepage for both, so without this every route would self-canonicalize to
  // "/" (telling Google the sub-pages are duplicates of the homepage).
  const canonicalUrl = SITE_ORIGIN + (to.path === '/' ? '/' : to.path.replace(/\/$/, ''))
  let canonical = document.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', canonicalUrl)
  const ogUrl = document.querySelector('meta[property="og:url"]')
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl)
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

// Recover from stale-deploy chunk failures. Lazy routes import hashed chunk
// files; after a redeploy the old hashes are gone, so a browser holding a
// cached index.html gets a failed dynamic import and navigation silently
// aborts (this is how the admin Students tab once "showed nothing"). One
// hard reload fetches the fresh index.html with current hashes. The
// sessionStorage flag stops a reload loop if something else is broken.
router.onError((error, to) => {
  const chunkFailed =
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('error loading dynamically imported module')
  if (chunkFailed && !sessionStorage.getItem('saha-chunk-reload')) {
    sessionStorage.setItem('saha-chunk-reload', '1')
    window.location.assign(to?.fullPath ?? window.location.pathname)
  }
})

router.afterEach(() => {
  // Navigation succeeded — clear the reload guard so a future deploy can
  // trigger recovery again.
  sessionStorage.removeItem('saha-chunk-reload')
})

export default router
