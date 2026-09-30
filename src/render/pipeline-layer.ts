import { Layer, type Canvas2DContext } from './layer'
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

function edge(
  start: VertexOutput,
  end: VertexOutput,
  x: number,
  y: number,
): number {
  return (x - start.x) * (end.y - start.y) - (y - start.y) * (end.x - start.x)
}

function fragmentShader(fragment: FragmentInput): string {
  const [red, green, blue] = fragment.color.map((channel) => Math.round(channel))
  return `rgb(${red}, ${green}, ${blue})`
}

function rasterizeTriangle(
  context: Canvas2DContext,
  triangle: [VertexOutput, VertexOutput, VertexOutput],
  pixelRatio: number,
): void {
  const [first, second, third] = triangle
  const area = edge(first, second, third.x, third.y)
  const minX = Math.max(0, Math.floor(Math.min(first.x, second.x, third.x)))
  const maxX = Math.ceil(Math.max(first.x, second.x, third.x))
  const minY = Math.max(0, Math.floor(Math.min(first.y, second.y, third.y)))
  const maxY = Math.ceil(Math.max(first.y, second.y, third.y))
  const startX = Math.floor(minX / pixelRatio) * pixelRatio
  const startY = Math.floor(minY / pixelRatio) * pixelRatio

  for (let y = startY; y <= maxY; y += pixelRatio) {
    for (let x = startX; x <= maxX; x += pixelRatio) {
      const sampleX = x + pixelRatio / 2
      const sampleY = y + pixelRatio / 2
      const firstWeight = edge(second, third, sampleX, sampleY) / area
      const secondWeight = edge(third, first, sampleX, sampleY) / area
      const thirdWeight = edge(first, second, sampleX, sampleY) / area

      if (firstWeight < 0 || secondWeight < 0 || thirdWeight < 0) continue

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
}

export class PipeLineRenderer extends Layer {
  private readonly options: PrimitiveRenderOptions

  constructor(width: number, height: number, options: PrimitiveRenderOptions) {
    super(width, height)
    this.options = options
  }

  render(): void {
    this.context.clearRect(0, 0, this.width, this.height)
    if (this.options.primitiveType !== 'triangle') {
      throw new Error(`不支持的图元类型: ${this.options.primitiveType}`)
    }
    const vertexOutputs = this.options.vertices.map((vertex) => vertexShader(vertex, this.width, this.height))
    const triangle = assembleTriangle(vertexOutputs)
    rasterizeTriangle(this.context, triangle, this.options.pixelRatio)
  }
}
