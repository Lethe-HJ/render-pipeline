export type PrimitiveType = 'triangle'
export type VertexColor = [number, number, number]

export interface NormalizedVertex {
  x: number
  y: number
  color: VertexColor
}

export interface NormalizedPoint {
  x: number
  y: number
}

export type PolygonPath = NormalizedPoint[]

export interface PrimitiveRenderOptions {
  vertices: NormalizedVertex[]
  paths?: PolygonPath[]
  primitiveType: PrimitiveType
  pixelRatio: number
  drawGrid: boolean
  drawPrimitiveConnections: boolean
}

export interface Canvas2dRenderOptions extends PrimitiveRenderOptions {
  width?: number
  height?: number
}