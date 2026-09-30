import { createCanvasSurface, type Canvas2DContext, type CanvasSurface } from './canvas-surface'
import { loadTriangleCoverageWasm } from './triangle-coverage-wasm'
import type { NormalizedVertex, PrimitiveRenderOptions, VertexColor } from './renderer-types'

interface VertexOutput extends NormalizedVertex {}

interface FragmentInput {
  x: number
  y: number
  color: VertexColor
}

function vertexShader(vertex: NormalizedVertex, width: number, height: number): VertexOutput {
  return {
    ...vertex,
    x: vertex.x * width,
    y: vertex.y * height,
  }
}

function assembleTriangle(vertices: VertexOutput[]): [VertexOutput, VertexOutput, VertexOutput] {
  if (vertices.length !== 3) {
    throw new Error('三角形图元需要恰好 3 个顶点')
  }
  return [vertices[0], vertices[1], vertices[2]]
}

function fragmentShader(fragment: FragmentInput): string {
  const [red, green, blue] = fragment.color.map((channel) => Math.round(channel))
  return `rgb(${red}, ${green}, ${blue})`
}

async function rasterizeTriangle(
  context: Canvas2DContext,
  triangle: [VertexOutput, VertexOutput, VertexOutput],
  pixelRatio: number,
): Promise<void> {
  const [first, second, third] = triangle
  const minX = Math.max(0, Math.floor(Math.min(first.x, second.x, third.x)))
  const maxX = Math.ceil(Math.max(first.x, second.x, third.x))
  const minY = Math.max(0, Math.floor(Math.min(first.y, second.y, third.y)))
  const maxY = Math.ceil(Math.max(first.y, second.y, third.y))
  const startX = Math.floor(minX / pixelRatio) * pixelRatio
  const startY = Math.floor(minY / pixelRatio) * pixelRatio
  if (maxX < startX || maxY < startY) return

  const columns = Math.floor((maxX - startX) / pixelRatio) + 1
  const rows = Math.floor((maxY - startY) / pixelRatio) + 1
  const sampleCount = columns * rows

  if (!Number.isSafeInteger(sampleCount) || sampleCount <= 0 || sampleCount > 0xffffffff) {
    throw new Error('三角形采样点数量超出 WASM 支持范围')
  }

  const wasm = await loadTriangleCoverageWasm()
  const outputPointer = wasm.allocate_weights(sampleCount)
  if (outputPointer === 0) {
    throw new Error('无法为 WASM 三角形采样结果分配内存')
  }

  try {
    wasm.rasterize_triangle(
      first.x,
      first.y,
      second.x,
      second.y,
      third.x,
      third.y,
      startX,
      startY,
      pixelRatio,
      columns,
      rows,
      outputPointer,
    )

    const weights = new Float64Array(wasm.memory.buffer, outputPointer, sampleCount * 3)
    let weightIndex = 0
    let row = 0
    for (let y = startY; row < rows; y += pixelRatio, row += 1) {
      let column = 0
      for (let x = startX; column < columns; x += pixelRatio, column += 1) {
        const firstWeight = weights[weightIndex]
        const secondWeight = weights[weightIndex + 1]
        const thirdWeight = weights[weightIndex + 2]
        weightIndex += 3
        if (firstWeight < 0) continue

        const sampleX = x + pixelRatio / 2
        const sampleY = y + pixelRatio / 2
        const color = first.color.map((channel, index) =>
          channel * firstWeight
          + second.color[index] * secondWeight
          + third.color[index] * thirdWeight,
        ) as VertexColor
        const colorStyle = fragmentShader({ x: sampleX, y: sampleY, color })

        context.beginPath()
        context.arc(sampleX, sampleY, pixelRatio * 0.2, 0, Math.PI * 2)
        context.fillStyle = colorStyle
        context.fill()
      }
    }
  } finally {
    wasm.deallocate_weights(outputPointer, sampleCount)
  }
}

export class PipeLineRenderer {
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

  async render(): Promise<void> {
    this.context.clearRect(0, 0, this.width, this.height)
    if (this.options.primitiveType !== 'triangle') {
      throw new Error(`不支持的图元类型: ${this.options.primitiveType}`)
    }
    const vertexOutputs = this.options.vertices.map((vertex) => vertexShader(vertex, this.width, this.height))
    const triangle = assembleTriangle(vertexOutputs)
    await rasterizeTriangle(this.context, triangle, this.options.pixelRatio)
  }
}