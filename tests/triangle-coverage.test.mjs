import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { performance } from 'node:perf_hooks'

const wasmPath = new URL('../wasm/target/wasm32-unknown-unknown/release/triangle_coverage_wasm.wasm', import.meta.url)
const wasmBytes = await readFile(wasmPath)
const { instance } = await WebAssembly.instantiate(wasmBytes)
const wasm = instance.exports

function rasterize(triangle, start, step, columns, rows, copyWeights = false) {
  const sampleCount = columns * rows
  const pointer = wasm.allocate_weights(sampleCount)
  assert.notEqual(pointer, 0)

  try {
    const [first, second, third] = triangle
    const insideCount = wasm.rasterize_triangle(
      first.x,
      first.y,
      second.x,
      second.y,
      third.x,
      third.y,
      start.x,
      start.y,
      step,
      columns,
      rows,
      pointer,
    )
    const weights = new Float64Array(wasm.memory.buffer, pointer, sampleCount * 3)
    return { insideCount, weights: copyWeights ? weights.slice() : weights }
  } finally {
    wasm.deallocate_weights(pointer, sampleCount)
  }
}

test('WASM batches coverage and barycentric weights for arbitrary triangles', () => {
  const result = rasterize(
    [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 8 }],
    { x: 0, y: 0 },
    4,
    2,
    2,
    true,
  )

  assert.equal(result.insideCount, 3)
  assert.deepEqual([...result.weights.slice(0, 3)], [0.5, 0.25, 0.25])
  assert.ok(Math.abs(result.weights[3]) < Number.EPSILON)
  assert.ok(Math.abs(result.weights[6]) < Number.EPSILON)
  assert.equal(result.weights[9], -1)

  const reversed = rasterize(
    [{ x: 0, y: 8 }, { x: 8, y: 0 }, { x: 0, y: 0 }],
    { x: 0, y: 0 },
    4,
    1,
    1,
    true,
  )
  assert.equal(reversed.insideCount, 1)
  assert.ok(Math.abs(reversed.weights.reduce((sum, weight) => sum + weight, 0) - 1) < Number.EPSILON)
})

test('benchmarks a full WASM coverage pass', (context) => {
  const gridSize = 1024
  const triangle = [{ x: 0, y: 0 }, { x: gridSize, y: 0 }, { x: 0, y: gridSize }]
  const scan = () => rasterize(triangle, { x: 0, y: 0 }, 1, gridSize, gridSize).insideCount
  const expectedCount = (gridSize * (gridSize + 1)) / 2

  for (let warmup = 0; warmup < 3; warmup += 1) {
    assert.equal(scan(), expectedCount)
  }

  let bestMilliseconds = Number.POSITIVE_INFINITY
  const repetitions = 12
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const start = performance.now()
    const insideCount = scan()
    bestMilliseconds = Math.min(bestMilliseconds, performance.now() - start)
    assert.equal(insideCount, expectedCount)
  }

  context.diagnostic(`Rust/WASM best of ${repetitions}: ${bestMilliseconds.toFixed(3)} ms`)
  context.diagnostic(`grid: ${gridSize * gridSize} samples; output: 3 Float64 weights per sample`)
})