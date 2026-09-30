import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import TriangleView from './views/TriangleView.vue'

export const demos = [
  {
    path: '/triangle',
    title: '绘制三角形',
    description: '离屏渲染与页面 canvas 合成',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/triangle', component: TriangleView },
  ],
})
