import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/render/triangle.ts',
      formats: ['es'],
      fileName: 'render-pipeline',
    },
  },
})