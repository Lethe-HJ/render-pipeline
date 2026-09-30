<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { demos } from '../router'
</script>

<template>
  <section class="intro-view">
    <div class="eyebrow">PLAYGROUND / 01</div>
    <div class="intro-grid">
      <div>
        <h1>把渲染过程<br /><em>摊开来看。</em></h1>
        <p class="lead">这里是 Render Pipeline 的实验场。每个 demo 都把一个渲染概念拆成清晰、可运行的步骤。</p>
      </div>
      <div class="intro-note">
        <span class="note-index">01</span>
        <p>从一个最小的三角形开始，观察离屏画布如何成为页面最终画面的中间站。</p>
      </div>
    </div>

    <div class="section-heading">
      <span>可用示例</span>
      <span class="section-count">{{ demos.length.toString().padStart(2, '0') }}</span>
    </div>
    <RouterLink v-for="demo in demos" :key="demo.path" class="demo-row" :to="demo.path">
      <span class="demo-number">01</span>
      <span class="demo-copy">
        <strong>{{ demo.title }}</strong>
        <small>{{ demo.description }}</small>
      </span>
      <span class="demo-arrow" aria-hidden="true">↗</span>
    </RouterLink>
  </section>
</template>
