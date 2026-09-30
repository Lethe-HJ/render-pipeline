<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { renderTriangleThroughOffscreen } from '@pipeline/render/triangle'

const canvas = ref<HTMLCanvasElement | null>(null)
const renderCount = ref(0)

function renderTriangle() {
  if (!canvas.value) return
  renderTriangleThroughOffscreen(canvas.value, { width: 760, height: 460 })
  renderCount.value += 1
}

onMounted(() => {
  void nextTick(renderTriangle)
})
</script>

<template>
  <section class="demo-view">
    <div class="demo-header">
      <div>
        <div class="eyebrow">DEMO / 01</div>
        <h1>绘制三角形</h1>
        <p class="lead">先在离屏 canvas 中完成绘制，再将结果合成到页面 canvas。</p>
      </div>
      <button class="render-button" type="button" @click="renderTriangle">
        <span>重新渲染</span>
        <span aria-hidden="true">↗</span>
      </button>
    </div>

    <div class="pipeline-layout">
      <div class="canvas-panel">
        <div class="panel-label"><span>OUTPUT CANVAS</span><span>760 × 460</span></div>
        <canvas ref="canvas" aria-label="绘制出的三角形"></canvas>
      </div>

      <aside class="process-panel">
        <div class="panel-label"><span>PIPELINE</span><span class="live-dot">LIVE</span></div>
        <ol class="pipeline-steps">
          <li><span>01</span><div><strong>创建离屏画布</strong><small>OffscreenCanvas</small></div></li>
          <li><span>02</span><div><strong>绘制三角形</strong><small>2D rendering context</small></div></li>
          <li class="active"><span>03</span><div><strong>合成到页面</strong><small>drawImage → output</small></div></li>
        </ol>
        <div class="render-state"><span class="status-dot"></span><span>已完成 {{ renderCount }} 次渲染</span></div>
      </aside>
    </div>
  </section>
</template>
