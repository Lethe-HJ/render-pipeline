export type CanvasSurface = HTMLCanvasElement | OffscreenCanvas
export type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export function createCanvasSurface(width: number, height: number): {
  surface: CanvasSurface
  context: Canvas2DContext
} {
  const surface = typeof OffscreenCanvas === 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(width, height)
  surface.width = width
  surface.height = height

  const context = surface.getContext('2d') as Canvas2DContext | null
  if (!context) {
    throw new Error('无法创建离屏 canvas 的 2D 渲染上下文')
  }

  return { surface, context }
}