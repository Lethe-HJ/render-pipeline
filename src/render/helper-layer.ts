import { Layer, type Canvas2DContext } from './layer'

const SIMULATED_PIXEL_SIZE = 20

function drawPixelHelper(context: Canvas2DContext, width: number, height: number): void {
  context.fillStyle = '#101827'
  context.fillRect(0, 0, width, height)

  const glow = context.createRadialGradient(width * 0.5, height * 0.45, 8, width * 0.5, height * 0.45, width * 0.65)
  glow.addColorStop(0, 'rgba(61, 214, 190, 0.18)')
  glow.addColorStop(1, 'rgba(61, 214, 190, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  context.beginPath()
  for (let x = SIMULATED_PIXEL_SIZE; x < width; x += SIMULATED_PIXEL_SIZE) {
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, height)
  }
  for (let y = SIMULATED_PIXEL_SIZE; y < height; y += SIMULATED_PIXEL_SIZE) {
    context.moveTo(0, y + 0.5)
    context.lineTo(width, y + 0.5)
  }
  context.strokeStyle = 'rgba(151, 180, 199, 0.16)'
  context.lineWidth = 1
  context.stroke()
}

export class HelperLayer extends Layer {
  render(): void {
    this.context.clearRect(0, 0, this.width, this.height)
    drawPixelHelper(this.context, this.width, this.height)
  }
}

export function pixelHelperRenderer(target: HTMLCanvasElement): void {
  const helperLayer = new HelperLayer(target.width, target.height)
  helperLayer.render()

  const context = target.getContext('2d')
  if (!context) {
    throw new Error('无法创建页面 canvas 的 2D 渲染上下文')
  }
  context.clearRect(0, 0, target.width, target.height)
  context.drawImage(helperLayer.offscreenCanvas, 0, 0)
}
