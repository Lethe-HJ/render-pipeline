import { HelperRenderer } from './helper-layer'
import { PageCanvasRenderer } from './page-canvas-renderer'
import { PipeLineRenderer } from './pipeline-layer'
import type { Canvas2dRenderOptions } from './renderer-types'

export class Canvas2dRenderer {
  private readonly target: HTMLCanvasElement

  constructor(target: HTMLCanvasElement) {
    this.target = target
  }

  render(options: Canvas2dRenderOptions): void {
    const width = options.width ?? (this.target.width || this.target.clientWidth || 640)
    const height = options.height ?? (this.target.height || this.target.clientHeight || 400)

    if (!Number.isFinite(options.pixelRatio) || options.pixelRatio <= 0) {
      throw new Error('pixelRatio 必须是大于 0 的有限数值')
    }

    this.target.width = width
    this.target.height = height

    const helperRenderer = new HelperRenderer(width, height, options)
    const pipeLineRenderer = new PipeLineRenderer(width, height, options)
    helperRenderer.render()
    pipeLineRenderer.render()
    new PageCanvasRenderer(this.target).render(helperRenderer, pipeLineRenderer)
  }
}