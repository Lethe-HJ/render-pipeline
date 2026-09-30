interface TriangleCoverageWasm extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  allocate_weights: (sampleCount: number) => number
  deallocate_weights: (pointer: number, sampleCount: number) => void
  rasterize_triangle: (
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
    thirdX: number,
    thirdY: number,
    startX: number,
    startY: number,
    step: number,
    columns: number,
    rows: number,
    outputPointer: number,
  ) => number
}

let wasmPromise: Promise<TriangleCoverageWasm> | undefined

export function loadTriangleCoverageWasm(): Promise<TriangleCoverageWasm> {
  wasmPromise ??= WebAssembly.instantiateStreaming(
    fetch(new URL('./triangle-coverage.wasm', import.meta.url)),
    {},
  ).then(({ instance }) => instance.exports as unknown as TriangleCoverageWasm)

  return wasmPromise
}