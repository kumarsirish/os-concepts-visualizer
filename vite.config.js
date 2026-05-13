import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main             : resolve(__dirname, 'index.html'),
        pageReplacement  : resolve(__dirname, 'page-replacement.html'),
        memory           : resolve(__dirname, 'memory.html'),
        paging           : resolve(__dirname, 'paging.html'),
        syscall          : resolve(__dirname, 'syscall.html'),
      },
    },
  },
})
