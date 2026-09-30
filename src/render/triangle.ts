export interface TriangleRenderOptions {
  width?: number
  height?: number
}

export function renderTriangleThroughOffscreen(
  target: HTMLCanvasElement,
  options: TriangleRenderOptions = {},
): void {
  const width = options.width ?? (target.width || target.clientWidth || 640)
  const height = options.height ?? (target.height || target.clientHeight || 400)

  target.width = width
  target.height = height

  const offscreen = typeof OffscreenCanvas === 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(width, height)

  offscreen.width = width
  offscreen.height = height

  const context = offscreen.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context) {
    throw new Error('无法创建离屏 canvas 的 2D 渲染上下文')
  }

  context.fillStyle = '#101827'
  context.fillRect(0, 0, width, height)

  const glow = context.createRadialGradient(width * 0.5, height * 0.45, 8, width * 0.5, height * 0.45, width * 0.65)
  glow.addColorStop(0, 'rgba(61, 214, 190, 0.18)')
  glow.addColorStop(1, 'rgba(61, 214, 190, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  context.beginPath()
  context.moveTo(width * 0.5, height * 0.18)
  context.lineTo(width * 0.8, height * 0.78)
  context.lineTo(width * 0.2, height * 0.78)
  context.closePath()
  context.fillStyle = '#3dd6be'
  context.fill()

  context.lineWidth = Math.max(2, width / 180)
  context.strokeStyle = '#b7fff3'
  context.stroke()

  const targetContext = target.getContext('2d')
  if (!targetContext) {
    throw new Error('无法创建页面 canvas 的 2D 渲染上下文')
  }

  targetContext.clearRect(0, 0, width, height)
  targetContext.drawImage(offscreen, 0, 0, width, height)
}