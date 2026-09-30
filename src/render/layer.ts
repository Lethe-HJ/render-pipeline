export type CanvasSurface = HTMLCanvasElement | OffscreenCanvas
export type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function createCanvasSurface(width: number, height: number): CanvasSurface {
  const canvas = typeof OffscreenCanvas === 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(width, height)
  canvas.width = width
  canvas.height = height
  return canvas
}

export abstract class Layer {
  readonly offscreenCanvas: CanvasSurface
  readonly width: number
  readonly height: number
  protected readonly context: Canvas2DContext

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.offscreenCanvas = createCanvasSurface(width, height)
    const context = this.offscreenCanvas.getContext('2d') as Canvas2DContext | null
    if (!context) {
      throw new Error('无法创建图层的离屏 canvas 2D 渲染上下文')
    }
    this.context = context
  }

  abstract render(): void
}
