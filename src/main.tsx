import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// La fuente se sirve desde el mismo sitio, sin pedirla a Google.
import '@fontsource-variable/plus-jakarta-sans'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/estructura.css'
import './estilos/componentes.css'
import App from './App'

const raiz = document.getElementById('raiz')
if (!raiz) {
  throw new Error('Falta el elemento #raiz en index.html')
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
