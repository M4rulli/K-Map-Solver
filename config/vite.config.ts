import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: "/K-Map-Solver/",
  css: {
    postcss: path.resolve(__dirname, './postcss.config.js')
  }
})