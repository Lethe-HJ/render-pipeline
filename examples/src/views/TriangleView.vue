<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Canvas2dRenderer } from '@pipeline/render/triangle'

const canvas = ref<HTMLCanvasElement | null>(null)

function renderTriangle() {
  if (!canvas.value) return
  new Canvas2dRenderer(canvas.value).render({
    width: 760,
    height: 460,
    primitiveType: 'triangle',
    vertices: [
      { x: 0.5, y: 0.18, color: [61, 214, 190] },
      { x: 0.8, y: 0.78, color: [111, 188, 255] },
      { x: 0.2, y: 0.78, color: [232, 126, 255] },
    ],
    pixelRatio: 20,
    drawGrid: true,
    drawPrimitiveConnections: true,
  })
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
