import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // O gerador de PDF (~1,2 MB) só é carregado ao clicar em "Gerar PDF".
  build: { chunkSizeWarningLimit: 1500 },
})
