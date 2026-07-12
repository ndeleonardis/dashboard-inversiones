import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config del dev server / build. Base relativa para poder servir el sitio
// estático detrás de una barrera de acceso desde cualquier subruta.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true, // accesible desde el celular en la red local
  },
})
