import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const BASE_TITLE = 'SAHA Institute For Learning'
const BASE_DESC = 'One-on-one tutoring in academics, Islamic studies, and standardized test prep for ages 4 to 17.'

const routes = [
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
    path: '/contact',
    name: 'Contact',
    component: () => import('../views/Contact.vue'),
    meta: {
      title: `Contact | ${BASE_TITLE}`,
      description: 'Get in touch with SAHA Institute. Call (504) 667-3625 or send a message — we typically respond within 24 hours.',
    },
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

// Update document title and meta description on route change
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
})

export default router
