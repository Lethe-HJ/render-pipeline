import { createCanvasSurface, type Canvas2DContext, type CanvasSurface } from './canvas-surface'
import type { PrimitiveRenderOptions } from './renderer-types'

function drawPixelHelper(
  context: Canvas2DContext,
  width: number,
  height: number,
  { vertices, pixelRatio, drawGrid, drawPrimitiveConnections }: PrimitiveRenderOptions,
): void {
  context.fillStyle = '#101827'
  context.fillRect(0, 0, width, height)

  const glow = context.createRadialGradient(width * 0.5, height * 0.45, 8, width * 0.5, height * 0.45, width * 0.65)
  glow.addColorStop(0, 'rgba(61, 214, 190, 0.18)')
  glow.addColorStop(1, 'rgba(61, 214, 190, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  if (drawGrid) {
    context.beginPath()
    for (let x = pixelRatio; x < width; x += pixelRatio) {
      context.moveTo(x + 0.5, 0)
      context.lineTo(x + 0.5, height)
    }
    for (let y = pixelRatio; y < height; y += pixelRatio) {
      context.moveTo(0, y + 0.5)
      context.lineTo(width, y + 0.5)
    }
    context.strokeStyle = 'rgba(151, 180, 199, 0.16)'
    context.lineWidth = 1
    context.stroke()
  }

  context.beginPath()
  for (const [index, vertex] of vertices.entries()) {
    const x = vertex.x * width
    const y = vertex.y * height
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.closePath()
  context.fillStyle = 'rgba(61, 214, 190, 0.16)'
  context.fill()
  if (drawPrimitiveConnections) {
    context.strokeStyle = 'rgba(61, 214, 190, 0.8)'
    context.lineWidth = 1
    context.stroke()
  }
}

export class HelperRenderer {
  readonly offscreenCanvas: CanvasSurface
  readonly width: number
  readonly height: number
  private readonly context: Canvas2DContext
  private readonly options: PrimitiveRenderOptions

  constructor(width: number, height: number, options: PrimitiveRenderOptions) {
    this.width = width
    this.height = height
    const { surface, context } = createCanvasSurface(width, height)
    this.offscreenCanvas = surface
    this.context = context
    this.options = options
  }

  render(): void {
    this.context.clearRect(0, 0, this.width, this.height)
    drawPixelHelper(this.context, this.width, this.height, this.options)
  }
}