import Home from '../views/Home.vue'
import { useAdminAuth } from '../composables/useAdminAuth.js'
import { useStudentAuth } from '../composables/useStudentAuth.js'

// vite-ssg owns the router instance (it picks web vs memory history for client
// vs prerender). This module exports the route table + the guard wiring; head
// tags (title/description/canonical/og) are handled by useHead in App.vue.

const BASE_TITLE = 'SAHA Institute For Learning'
const BASE_DESC = 'One-on-one tutoring in academics, Islamic studies, and standardized test prep for ages 4 to 17.'

export const routes = [
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
    path: '/workshops',
    name: 'Workshops',
    component: () => import('../views/WorkshopsView.vue'),
    meta: {
      title: `July 2026 Summer Workshop Series | ${BASE_TITLE}`,
      description: 'Eleven hands-on workshops across July 2026 at SAHA Institute in Kenner, LA — baking, cybersecurity & AI, henna, Arabic calligraphy, auto skills, and more. Sign up online.',
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
  {
    path: '/careers',
    name: 'Careers',
    component: () => import('../views/CareersView.vue'),
    meta: {
      title: `Join Our Team | ${BASE_TITLE}`,
      description: 'Apply to teach at SAHA Institute in Kenner, LA. We\'re looking for tutors who love one-on-one teaching — submit your application and resume online.',
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
  // Teacher invite completion. A teacher reaches this via a one-time link the
  // admin shares; the token in the path authorises setting their password. Bare
  // (no public nav/footer) like the student auth flows. Not indexed.
  {
    path: '/teacher-setup/:token',
    name: 'TeacherSetup',
    component: () => import('../views/TeacherSetupView.vue'),
    meta: {
      bare: true,
      title: `Set Up Your Account | ${BASE_TITLE}`,
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
    // Admins land on Workshop Signups; teachers are redirected to Schedule by
    // the role guard in setupRouter (workshop-signups is adminOnly).
    redirect: '/admin/workshop-signups',
    children: [
      {
        // Both roles. Admin sees the master calendar; a teacher sees only their
        // own classes (enforced server-side by teacher_id from the token).
        path: 'schedule',
        name: 'AdminSchedule',
        component: () => import('../views/admin/ScheduleView.vue'),
        meta: { admin: true, requiresAuth: true, title: `Schedule | ${BASE_TITLE}` },
      },
      {
        path: 'teachers',
        name: 'AdminTeachers',
        component: () => import('../views/admin/TeachersView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `Teachers | ${BASE_TITLE}` },
      },
      {
        path: 'workshop-signups',
        name: 'AdminWorkshopSignups',
        component: () => import('../views/admin/WorkshopSignupsView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `Workshop Signups | ${BASE_TITLE}` },
      },
      {
        path: 'summer-camp',
        name: 'AdminSummerCamp',
        component: () => import('../views/admin/SummerCampView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `Summer Camp 2026 | ${BASE_TITLE}` },
      },
      {
        path: 'stem-program',
        name: 'AdminStemProgram',
        component: () => import('../views/admin/StemProgramView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `STEM Program | ${BASE_TITLE}` },
      },
      {
        path: 'students',
        name: 'AdminStudents',
        component: () => import('../views/admin/StudentsView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `Students | ${BASE_TITLE}` },
      },
      {
        path: 'payments',
        name: 'AdminPayments',
        component: () => import('../views/admin/PaymentsView.vue'),
        meta: { admin: true, requiresAuth: true, adminOnly: true, title: `Payments | ${BASE_TITLE}` },
      },
    ],
  },
]

export function scrollBehavior(to, from, savedPosition) {
  if (to.hash) {
    return { el: to.hash, behavior: 'smooth' }
  }
  if (savedPosition) return savedPosition
  return { top: 0, behavior: 'smooth' }
}

// Wire guards + client-only recovery onto the router vite-ssg created.
// `isClient` is false during the build-time prerender (no window/sessionStorage).
export function setupRouter(router, isClient) {
  // Auth guards. Admin routes check the admin session; the student portal checks
  // the (separate) student session. Each hits its /me endpoint once per session —
  // `ensureChecked` is a no-op after the first call. Prerendered routes are all
  // public, so this never runs the auth fetch during the build.
  router.beforeEach(async (to) => {
    if (to.meta?.requiresAuth) {
      const { isAuthenticated, isAdmin, ensureChecked } = useAdminAuth()
      await ensureChecked()
      if (!isAuthenticated.value) {
        return { name: 'AdminLogin', query: { next: to.fullPath } }
      }
      // Teachers may only reach shared routes (the Schedule). Admin-only
      // management tabs bounce them to their calendar.
      if (to.meta?.adminOnly && !isAdmin.value) {
        return { name: 'AdminSchedule' }
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

  if (!isClient) return

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
}
