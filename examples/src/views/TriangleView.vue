<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderTriangleThroughOffscreen } from '@pipeline/render/triangle'

const canvas = ref<HTMLCanvasElement | null>(null)

function renderTriangle() {
  if (!canvas.value) return
  renderTriangleThroughOffscreen(canvas.value, { width: 760, height: 460 })
}

onMounted(() => {
  renderTriangle()
})
</script>

<template>
  <section class="demo-view">
    <div class="demo-header">
      <div>
        <h1>绘制三角形</h1>
      </div>
    </div>

    <div class="pipeline-layout">
      <div class="canvas-panel">
        <canvas ref="canvas" aria-label="绘制出的三角形"></canvas>
      </div>
    </div>
  </section>
</template>
