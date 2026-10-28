import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
// La fuente se sirve desde el mismo sitio, sin pedirla a Google.
import '@fontsource-variable/plus-jakarta-sans'
import './estilos/tokens.css'
import './estilos/base.css'
import './estilos/estructura.css'
import './estilos/componentes.css'
import App from './App'
import { crearAutenticacionSupabase } from './acceso/autenticacion.ts'
import { leerAvisoDeLaUrl, sinAvisoEnLaUrl } from './acceso/aviso-de-entrada.ts'
import { leerConfiguracion } from './config.ts'
import { crearCliente } from './datos/cliente.ts'
import { crearRepositorioSupabase } from './datos/repositorio.ts'

const raiz = document.getElementById('raiz')
if (!raiz) {
  throw new Error('Falta el elemento #raiz en index.html')
}

// Si Supabase volvió de Google con un error, se lee y se saca de la URL antes
// de crear el cliente, así no vuelve a aparecer al recargar.
const avisoInicial = leerAvisoDeLaUrl(window.location.href)
if (avisoInicial) window.history.replaceState(window.history.state, '', sinAvisoEnLaUrl(window.location.href))

function iniciar(): ReactNode {
  try {
    const cliente = crearCliente(leerConfiguracion())
    return (
      <App
        autenticacion={crearAutenticacionSupabase(cliente)}
        repositorio={crearRepositorioSupabase(cliente)}
        avisoInicial={avisoInicial}
      />
    )
  } catch (error) {
    // A la copia le falta configuración: el mensaje dice qué falta.
    return <p className="falla-configuracion">{(error as Error).message}</p>
  }
}

createRoot(raiz).render(<StrictMode>{iniciar()}</StrictMode>)
