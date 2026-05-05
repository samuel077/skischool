import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'index.html'),
        teine:   resolve(__dirname, 'teine.html'),
        kokusai: resolve(__dirname, 'kokusai.html'),
        kiroro:  resolve(__dirname, 'kiroro.html'),
        rusutsu: resolve(__dirname, 'rusutsu.html'),
      }
    }
  },
})
