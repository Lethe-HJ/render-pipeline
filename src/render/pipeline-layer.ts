import { Layer, type Canvas2DContext } from './layer'

const SIMULATED_PIXEL_SIZE = 20

type Color = [number, number, number]

interface VertexInput {
  x: number
  y: number
  color: Color
}

interface VertexOutput extends VertexInput {}

interface FragmentInput {
  x: number
  y: number
  color: Color
}

function vertexShader(vertex: VertexInput, width: number, height: number): VertexOutput {
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
): void {
  const [first, second, third] = triangle
  const area = edge(first, second, third.x, third.y)
  const minX = Math.max(0, Math.floor(Math.min(first.x, second.x, third.x)))
  const maxX = Math.ceil(Math.max(first.x, second.x, third.x))
  const minY = Math.max(0, Math.floor(Math.min(first.y, second.y, third.y)))
  const maxY = Math.ceil(Math.max(first.y, second.y, third.y))
  const startX = Math.floor(minX / SIMULATED_PIXEL_SIZE) * SIMULATED_PIXEL_SIZE
  const startY = Math.floor(minY / SIMULATED_PIXEL_SIZE) * SIMULATED_PIXEL_SIZE

  for (let y = startY; y <= maxY; y += SIMULATED_PIXEL_SIZE) {
    for (let x = startX; x <= maxX; x += SIMULATED_PIXEL_SIZE) {
      const sampleX = x + SIMULATED_PIXEL_SIZE / 2
      const sampleY = y + SIMULATED_PIXEL_SIZE / 2
      const firstWeight = edge(second, third, sampleX, sampleY) / area
      const secondWeight = edge(third, first, sampleX, sampleY) / area
      const thirdWeight = edge(first, second, sampleX, sampleY) / area

      if (firstWeight < 0 || secondWeight < 0 || thirdWeight < 0) continue

      const color = first.color.map((channel, index) =>
        channel * firstWeight
        + second.color[index] * secondWeight
        + third.color[index] * thirdWeight,
      ) as Color
      const colorStyle = fragmentShader({ x: sampleX, y: sampleY, color })

      context.beginPath()
      context.arc(sampleX, sampleY, SIMULATED_PIXEL_SIZE * 0.2, 0, Math.PI * 2)
      context.fillStyle = colorStyle
      context.fill()
    }
  }
}

export class PipeLineLayer extends Layer {
  render(): void {
    this.context.clearRect(0, 0, this.width, this.height)
    const vertexInputs: VertexInput[] = [
      { x: 0.5, y: 0.18, color: [61, 214, 190] },
      { x: 0.8, y: 0.78, color: [111, 188, 255] },
      { x: 0.2, y: 0.78, color: [232, 126, 255] },
    ]
    const vertexOutputs = vertexInputs.map((vertex) => vertexShader(vertex, this.width, this.height))
    const triangle = assembleTriangle(vertexOutputs)
    rasterizeTriangle(this.context, triangle)
  }
}
