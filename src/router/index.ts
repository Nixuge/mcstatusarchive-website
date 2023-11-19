import { createRouter, createWebHistory } from 'vue-router'
import SelectorView from '../views/SelectorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: SelectorView
    },
    {
      path: '/server/',
      name: 'serverHome',
      component: SelectorView
    },
    {
      path: '/server/:server',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/ServerView.vue')
    },
    {
      path: "/:pathMatch(.*)*",
      name: "rootCatchAll",
      component: SelectorView,
    }
  ]
})

export default router
