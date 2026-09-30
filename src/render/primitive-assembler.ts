import type { PolygonPath, PrimitiveRenderOptions } from './renderer-types'

export function assemblePrimitivePaths({ primitiveType, vertices, paths }: PrimitiveRenderOptions): PolygonPath[] {
  if (primitiveType !== 'triangle') {
    throw new Error(`不支持的图元类型: ${primitiveType}`)
  }
  if (vertices.length !== 3) {
    throw new Error('三角形图元需要恰好 3 个顶点')
  }

  const assembledPaths = paths ?? [vertices.map(({ x, y }) => ({ x, y }))]
  if (assembledPaths.length === 0 || assembledPaths.some((path) => path.length < 3)) {
    throw new Error('多边形路径需要至少 3 个顶点')
  }
  return assembledPaths
}