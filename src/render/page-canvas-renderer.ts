import { HelperLayer } from './helper-layer'
import { PipeLineLayer } from './pipeline-layer'

export class PageCanvasRenderer {
  private readonly target: HTMLCanvasElement

  constructor(target: HTMLCanvasElement) {
    this.target = target
  }

  render(helperLayer: HelperLayer, pipeLineLayer: PipeLineLayer): void {
    const context = this.target.getContext('2d')
    if (!context) {
      throw new Error('无法创建页面 canvas 的 2D 渲染上下文')
    }

    context.clearRect(0, 0, this.target.width, this.target.height)
    context.drawImage(helperLayer.offscreenCanvas, 0, 0, this.target.width, this.target.height)
    context.drawImage(pipeLineLayer.offscreenCanvas, 0, 0, this.target.width, this.target.height)
  }
}
