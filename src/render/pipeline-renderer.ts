import { createCanvasSurface, type Canvas2DContext, type CanvasSurface } from './canvas-surface'
import { loadTriangleCoverageWasm } from './triangle-coverage-wasm'
import type { NormalizedPoint, NormalizedVertex, PrimitiveRenderOptions, VertexColor } from './renderer-types'

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

function createBarycentricTransform(
  triangle: [VertexOutput, VertexOutput, VertexOutput],
): ((point: NormalizedPoint) => [number, number, number]) | undefined {
  const [first, second, third] = triangle
  const denominator = (second.y - third.y) * (first.x - third.x)
    + (third.x - second.x) * (first.y - third.y)
  if (denominator === 0) return undefined

  const firstX = (second.y - third.y) / denominator
  const firstY = (third.x - second.x) / denominator
  const firstOffset = -(firstX * third.x + firstY * third.y)
  const secondX = (third.y - first.y) / denominator
  const secondY = (first.x - third.x) / denominator
  const secondOffset = -(secondX * third.x + secondY * third.y)
  return ({ x, y }) => {
    const firstWeight = firstX * x + firstY * y + firstOffset
    const secondWeight = secondX * x + secondY * y + secondOffset
    return [firstWeight, secondWeight, 1 - firstWeight - secondWeight]
  }
}

async function rasterizePaths(
  context: Canvas2DContext,
  paths: NormalizedPoint[][],
  triangle: [VertexOutput, VertexOutput, VertexOutput],
  pixelRatio: number,
  width: number,
  height: number,
): Promise<void> {
  const [first, second, third] = triangle
  const barycentricTransform = createBarycentricTransform(triangle)
  if (!barycentricTransform) return
  const points = paths.flat()
  let minPointX = Number.POSITIVE_INFINITY
  let maxPointX = Number.NEGATIVE_INFINITY
  let minPointY = Number.POSITIVE_INFINITY
  let maxPointY = Number.NEGATIVE_INFINITY
  for (const point of points) {
    minPointX = Math.min(minPointX, point.x)
    maxPointX = Math.max(maxPointX, point.x)
    minPointY = Math.min(minPointY, point.y)
    maxPointY = Math.max(maxPointY, point.y)
  }
  const minX = Math.max(0, Math.floor(minPointX))
  const maxX = Math.min(width, Math.ceil(maxPointX))
  const minY = Math.max(0, Math.floor(minPointY))
  const maxY = Math.min(height, Math.ceil(maxPointY))
  const startX = Math.floor(minX / pixelRatio) * pixelRatio
  const startY = Math.floor(minY / pixelRatio) * pixelRatio
  if (maxX < startX || maxY < startY) return

  const columns = Math.floor((maxX - startX) / pixelRatio) + 1
  const rows = Math.floor((maxY - startY) / pixelRatio) + 1
  const sampleCount = columns * rows

  if (!Number.isSafeInteger(sampleCount) || sampleCount <= 0 || sampleCount > 0xffffffff) {
    throw new Error('多边形采样点数量超出 WASM 支持范围')
  }
  const pointCount = points.length
  const pathEnds = new Uint32Array(paths.length)
  let endIndex = 0
  for (const [index, path] of paths.entries()) {
    endIndex += path.length
    pathEnds[index] = endIndex
  }

  const wasm = await loadTriangleCoverageWasm()
  const pointsPointer = wasm.allocate_points(pointCount)
  const pathEndsPointer = wasm.allocate_path_ends(paths.length)
  const outputPointer = wasm.allocate_coverage(sampleCount)
  if (pointsPointer === 0 || pathEndsPointer === 0 || outputPointer === 0) {
    if (pointsPointer !== 0) wasm.deallocate_points(pointsPointer, pointCount)
    if (pathEndsPointer !== 0) wasm.deallocate_path_ends(pathEndsPointer, paths.length)
    if (outputPointer !== 0) wasm.deallocate_coverage(outputPointer, sampleCount)
    throw new Error('无法为 WASM 多边形采样结果分配内存')
  }

  try {
    const wasmPoints = new Float64Array(wasm.memory.buffer, pointsPointer, pointCount * 2)
    for (const [index, point] of points.entries()) {
      wasmPoints[index * 2] = point.x
      wasmPoints[index * 2 + 1] = point.y
    }
    new Uint32Array(wasm.memory.buffer, pathEndsPointer, paths.length).set(pathEnds)
    wasm.rasterize_paths(
      pointsPointer,
      pointCount,
      pathEndsPointer,
      paths.length,
      startX,
      startY,
      pixelRatio,
      columns,
      rows,
      outputPointer,
    )

    const coverage = new Uint8Array(wasm.memory.buffer, outputPointer, sampleCount)
    let coverageIndex = 0
    let row = 0
    for (let y = startY; row < rows; y += pixelRatio, row += 1) {
      let column = 0
      for (let x = startX; column < columns; x += pixelRatio, column += 1) {
        const covered = coverage[coverageIndex]
        coverageIndex += 1
        if (covered === 0) continue

        const sampleX = x + pixelRatio / 2
        const sampleY = y + pixelRatio / 2
        const [firstWeight, secondWeight, thirdWeight] = barycentricTransform({ x: sampleX, y: sampleY })
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
    wasm.deallocate_points(pointsPointer, pointCount)
    wasm.deallocate_path_ends(pathEndsPointer, paths.length)
    wasm.deallocate_coverage(outputPointer, sampleCount)
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
    const vertexOutputs = this.options.vertices.map((vertex) => vertexShader(vertex, this.width, this.height))
    const triangle = assembleTriangle(vertexOutputs)
    const paths = (this.options.paths ?? [triangle]).map((path) =>
      path.map((point) => ({ x: point.x * this.width, y: point.y * this.height })),
    )
    await rasterizePaths(this.context, paths, triangle, this.options.pixelRatio, this.width, this.height)
  }
}