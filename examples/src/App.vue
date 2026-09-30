<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { demos } from './router'
</script>

<template>
  <div class="demo-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">RP</span>
        <span>
          <strong>Render Pipeline</strong>
          <small>交互式渲染示例</small>
        </span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink to="/">总览</RouterLink>
        <RouterLink v-for="demo in demos" :key="demo.path" :to="demo.path">
          {{ demo.title }}
        </RouterLink>
      </nav>
    </header>

    <main class="page-frame">
      <RouterView />
    </main>

    <footer class="footer">
      <span>Render Pipeline / Examples</span>
      <span>Web Canvas experiments</span>
    </footer>
  </div>
</template>
