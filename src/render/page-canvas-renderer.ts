import { HelperRenderer } from './helper-renderer'
import { PipeLineRenderer } from './pipeline-renderer'
import { assemblePrimitivePaths } from './primitive-assembler'
import type { Canvas2dRenderOptions } from './renderer-types'

export class PageCanvasRenderer {
  private readonly target: HTMLCanvasElement

  constructor(target: HTMLCanvasElement) {
    this.target = target
  }

  async render(options: Canvas2dRenderOptions): Promise<void> {
    const width = options.width ?? (this.target.width || this.target.clientWidth || 640)
    const height = options.height ?? (this.target.height || this.target.clientHeight || 400)

    if (!Number.isFinite(options.pixelRatio) || options.pixelRatio <= 0) {
      throw new Error('pixelRatio 必须是大于 0 的有限数值')
    }

    const paths = assemblePrimitivePaths(options)
    const renderOptions = { ...options, paths }

    this.target.width = width
    this.target.height = height

    const helperRenderer = new HelperRenderer(width, height, renderOptions)
    const pipeLineRenderer = new PipeLineRenderer(width, height, renderOptions)
    helperRenderer.render()
    await pipeLineRenderer.render()

    const context = this.target.getContext('2d')
    if (!context) {
      throw new Error('无法创建页面 canvas 的 2D 渲染上下文')
    }

    context.clearRect(0, 0, this.target.width, this.target.height)
    context.drawImage(helperRenderer.offscreenCanvas, 0, 0, this.target.width, this.target.height)
    context.drawImage(pipeLineRenderer.offscreenCanvas, 0, 0, this.target.width, this.target.height)
  }
}
