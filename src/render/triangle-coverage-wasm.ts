interface PolygonCoverageWasm extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  allocate_points: (pointCount: number) => number
  deallocate_points: (pointer: number, pointCount: number) => void
  allocate_path_ends: (pathCount: number) => number
  deallocate_path_ends: (pointer: number, pathCount: number) => void
  allocate_coverage: (sampleCount: number) => number
  deallocate_coverage: (pointer: number, sampleCount: number) => void
  rasterize_paths: (
    pointsPointer: number,
    pointCount: number,
    pathEndsPointer: number,
    pathCount: number,
    startX: number,
    startY: number,
    step: number,
    columns: number,
    rows: number,
    outputPointer: number,
  ) => number
}

let wasmPromise: Promise<PolygonCoverageWasm> | undefined

export function loadTriangleCoverageWasm(): Promise<PolygonCoverageWasm> {
  wasmPromise ??= WebAssembly.instantiateStreaming(
    fetch(new URL('./triangle-coverage.wasm', import.meta.url)),
    {},
  ).then(({ instance }) => instance.exports as unknown as PolygonCoverageWasm)

  return wasmPromise
}