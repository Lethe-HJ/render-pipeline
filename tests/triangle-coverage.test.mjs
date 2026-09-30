import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { performance } from 'node:perf_hooks'

const wasmPath = new URL('../wasm/target/wasm32-unknown-unknown/release/triangle_coverage_wasm.wasm', import.meta.url)
const wasmBytes = await readFile(wasmPath)
const { instance } = await WebAssembly.instantiate(wasmBytes)
const wasm = instance.exports

function rasterize(paths, start, step, columns, rows, copyCoverage = false) {
  const sampleCount = columns * rows
  const points = paths.flat()
  const ends = []
  let pointCount = 0
  for (const path of paths) {
    pointCount += path.length
    ends.push(pointCount)
  }
  const pointsPointer = wasm.allocate_points(pointCount)
  const endsPointer = wasm.allocate_path_ends(paths.length)
  const coveragePointer = wasm.allocate_coverage(sampleCount)
  assert.notEqual(pointsPointer, 0)
  assert.notEqual(endsPointer, 0)
  assert.notEqual(coveragePointer, 0)

  try {
    const pointValues = new Float64Array(wasm.memory.buffer, pointsPointer, pointCount * 2)
    points.forEach(({ x, y }, index) => {
      pointValues[index * 2] = x
      pointValues[index * 2 + 1] = y
    })
    new Uint32Array(wasm.memory.buffer, endsPointer, paths.length).set(ends)
    const insideCount = wasm.rasterize_paths(
      pointsPointer,
      pointCount,
      endsPointer,
      paths.length,
      start.x,
      start.y,
      step,
      columns,
      rows,
      coveragePointer,
    )
    const coverage = new Uint8Array(wasm.memory.buffer, coveragePointer, sampleCount)
    return { insideCount, coverage: copyCoverage ? coverage.slice() : coverage }
  } finally {
    wasm.deallocate_points(pointsPointer, pointCount)
    wasm.deallocate_path_ends(endsPointer, paths.length)
    wasm.deallocate_coverage(coveragePointer, sampleCount)
  }
}

test('WASM batches point-in-polygon coverage for arbitrary paths', () => {
  const result = rasterize(
    [[{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 8 }]],
    { x: 0, y: 0 },
    4,
    2,
    2,
    true,
  )

  assert.equal(result.insideCount, 3)
  assert.deepEqual([...result.coverage], [1, 1, 1, 0])

  const reversed = rasterize(
    [[{ x: 0, y: 8 }, { x: 8, y: 0 }, { x: 0, y: 0 }]],
    { x: 0, y: 0 },
    4,
    1,
    1,
    true,
  )
  assert.equal(reversed.insideCount, 1)
  assert.deepEqual([...reversed.coverage], [1])
})

test('WASM treats additional paths as holes regardless of winding', () => {
  const result = rasterize(
    [
      [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 12 }, { x: 0, y: 12 }],
      [{ x: 4, y: 4 }, { x: 8, y: 4 }, { x: 8, y: 8 }, { x: 4, y: 8 }],
    ],
    { x: 0, y: 0 },
    4,
    3,
    3,
    true,
  )
  assert.equal(result.insideCount, 8)
  assert.equal(result.coverage[4], 0)
})

test('benchmarks a full WASM coverage pass', (context) => {
  const gridSize = 1024
  const triangle = [[{ x: 0, y: 0 }, { x: gridSize, y: 0 }, { x: 0, y: gridSize }]]
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
  context.diagnostic(`grid: ${gridSize * gridSize} samples; output: 1 coverage byte per sample`)
})