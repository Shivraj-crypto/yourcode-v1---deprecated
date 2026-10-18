import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pyodideAssets = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

function copyPyodideRuntime() {
  return {
    name: 'copy-pyodide-runtime',
    configResolved(config) {
      const sourceDirectory = fileURLToPath(new URL('./node_modules/pyodide/', import.meta.url))
      const targetDirectory = `${config.publicDir}/pyodide`
      mkdirSync(targetDirectory, { recursive: true })
      for (const asset of pyodideAssets) {
        copyFileSync(`${sourceDirectory}/${asset}`, `${targetDirectory}/${asset}`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyPyodideRuntime()],
})
