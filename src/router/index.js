import Vue from 'vue'
import VueRouter from 'vue-router'
import {isLoggedIn} from '@/utils/auth'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        name: 'index',
        component: () => import(/* webpackChunkName: "dashboard" */ '@/views/index.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/login.vue')
    },
]

const router = new VueRouter({
    // publicPath 为相对路径（'./'），history 模式下刷新 /login 会 404，故用 hash 模式
    mode: 'hash',
    routes
})

router.beforeEach((to, from, next) => {
    if (to.name !== 'login' && !isLoggedIn()) {
        next({name: 'login', query: {redirect: to.fullPath}})
    } else if (to.name === 'login' && isLoggedIn()) {
        next('/')
    } else {
        next()
    }
})

export default router
