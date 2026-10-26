import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sitio estático. Nginx lo sirve en la raíz de un subdominio y devuelve
// index.html para cualquier ruta, así funcionan las rutas del navegador.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // para abrirlo desde el celular en la red local
  },
})
