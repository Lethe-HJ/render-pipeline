import { HelperLayer } from './helper-layer'
import { PageCanvasRenderer } from './page-canvas-renderer'
import { PipeLineLayer } from './pipeline-layer'

export { Layer } from './layer'
export { HelperLayer, pixelHelperRenderer } from './helper-layer'
export { PageCanvasRenderer } from './page-canvas-renderer'
export { PipeLineLayer } from './pipeline-layer'

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

  const helperLayer = new HelperLayer(width, height)
  const pipeLineLayer = new PipeLineLayer(width, height)
  helperLayer.render()
  pipeLineLayer.render()
  new PageCanvasRenderer(target).render(helperLayer, pipeLineLayer)
}