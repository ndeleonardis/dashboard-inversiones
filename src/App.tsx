import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import type { Autenticacion } from './acceso/autenticacion.ts'
import type { AvisoDeEntrada } from './acceso/aviso-de-entrada.ts'
import { RutaProtegida } from './acceso/RutaProtegida.tsx'
import { ProveedorDeSesion, useSesion } from './acceso/Sesion.tsx'
import { Estructura } from './componentes/Estructura.tsx'
import { ProveedorDeRepositorio } from './datos/contexto.tsx'
import type { Repositorio } from './datos/repositorio.ts'
import { DetalleDeCuenta, ListaDeCuentas, NuevaCuenta } from './pantallas/cuentas/Cuentas.tsx'
import { Entrar } from './pantallas/Entrar.tsx'
import { EditarGasto, ListaDeGastos, NuevoGasto } from './pantallas/gastos/Gastos.tsx'
import { EditarIngreso, ListaDeIngresos, NuevoIngreso } from './pantallas/ingresos/Ingresos.tsx'
import { EditarInstrumento, ListaDeInstrumentos, NuevoInstrumento } from './pantallas/instrumentos/Instrumentos.tsx'
import { EditarOperacion, ListaDeOperaciones, NuevaOperacion } from './pantallas/operaciones/Operaciones.tsx'
import { EditarPersona, ListaDePersonas, NuevaPersona } from './pantallas/personas/Personas.tsx'
import { RUTAS } from './rutas.ts'

type PropsApp = {
  autenticacion: Autenticacion
  repositorio: Repositorio
  avisoInicial?: AvisoDeEntrada | null
}

function ConEstructura() {
  const { salir } = useSesion()
  return (
    <Estructura alSalir={salir}>
      <Outlet />
    </Estructura>
  )
}

export default function App({ autenticacion, repositorio, avisoInicial = null }: PropsApp) {
  const [consultas] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={consultas}>
      <ProveedorDeRepositorio repositorio={repositorio}>
        <ProveedorDeSesion autenticacion={autenticacion} avisoInicial={avisoInicial}>
          <BrowserRouter>
            <Routes>
              <Route path={RUTAS.entrar} element={<Entrar />} />
              <Route element={<RutaProtegida />}>
                <Route element={<ConEstructura />}>
                  <Route index element={<h1>Resumen</h1>} />
                  <Route path={RUTAS.gastos} element={<ListaDeGastos />} />
                  <Route path={RUTAS.gastoNuevo} element={<NuevoGasto />} />
                  <Route path={`${RUTAS.gastos}/:id`} element={<EditarGasto />} />
                  <Route path={RUTAS.ingresos} element={<ListaDeIngresos />} />
                  <Route path={RUTAS.ingresoNuevo} element={<NuevoIngreso />} />
                  <Route path={`${RUTAS.ingresos}/:id`} element={<EditarIngreso />} />
                  <Route path={RUTAS.personas} element={<ListaDePersonas />} />
                  <Route path={RUTAS.personaNueva} element={<NuevaPersona />} />
                  <Route path={`${RUTAS.personas}/:id`} element={<EditarPersona />} />
                  <Route path={RUTAS.cuentas} element={<ListaDeCuentas />} />
                  <Route path={RUTAS.cuentaNueva} element={<NuevaCuenta />} />
                  <Route path={`${RUTAS.cuentas}/:id`} element={<DetalleDeCuenta />} />
                  <Route path={RUTAS.instrumentos} element={<ListaDeInstrumentos />} />
                  <Route path={RUTAS.instrumentoNuevo} element={<NuevoInstrumento />} />
                  <Route path={`${RUTAS.instrumentos}/:id`} element={<EditarInstrumento />} />
                  <Route path={RUTAS.operaciones} element={<ListaDeOperaciones />} />
                  <Route path={RUTAS.operacionNueva} element={<NuevaOperacion />} />
                  <Route path={`${RUTAS.operaciones}/:id`} element={<EditarOperacion />} />
                  {/* El resumen llega en T23. */}
                  <Route path="*" element={<Navigate to={RUTAS.resumen} replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ProveedorDeSesion>
      </ProveedorDeRepositorio>
    </QueryClientProvider>
  )
}
