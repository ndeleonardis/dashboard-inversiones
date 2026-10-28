import { BrowserRouter } from 'react-router'
import { Estructura } from './componentes/Estructura.tsx'

// Las rutas, la sesión y las pantallas llegan desde T17.
export default function App() {
  return (
    <BrowserRouter>
      <Estructura>
        <h1>Resumen</h1>
      </Estructura>
    </BrowserRouter>
  )
}
