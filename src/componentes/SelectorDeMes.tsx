// Elegir el mes: el anterior, el siguiente o volver al actual. El mes va en la
// dirección (?mes=2026-10), así recargar o volver de un detalle no lo pierde.
import { useSearchParams } from 'react-router'
import { mesActual, mesAnterior, mesSiguiente } from '../dominio/fechas.ts'
import { formatearMes } from '../dominio/formato.ts'

const MES_EN_LA_RUTA = /^\d{4}-(0[1-9]|1[0-2])$/

/** El mes de la dirección, como su primer día, o el mes actual si no hay uno válido. */
export function useMesDeLaRuta(): [string, (mes: string) => void] {
  const [busqueda, setBusqueda] = useSearchParams()
  const pedido = busqueda.get('mes') ?? ''
  const mes = MES_EN_LA_RUTA.test(pedido) ? `${pedido}-01` : mesActual()
  // Sin sumar al historial: el botón de atrás no recorre los meses. Lo demás
  // que haya en la dirección, como la persona elegida, se queda.
  const cambiar = (nuevo: string) =>
    setBusqueda(
      (actual) => {
        const siguiente = new URLSearchParams(actual)
        siguiente.set('mes', nuevo.slice(0, 7))
        return siguiente
      },
      { replace: true },
    )
  return [mes, cambiar]
}

function Flecha({ hacia }: { hacia: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        d={hacia === 'izquierda' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SelectorDeMes({ mes, alCambiar }: { mes: string; alCambiar: (mes: string) => void }) {
  const nombre = formatearMes(mes)
  return (
    <div className="selector-mes">
      <button type="button" className="boton-redondo" aria-label="Mes anterior" onClick={() => alCambiar(mesAnterior(mes))}>
        <Flecha hacia="izquierda" />
      </button>
      <p className="selector-mes-nombre" aria-live="polite">
        {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
      </p>
      <button type="button" className="boton-redondo" aria-label="Mes siguiente" onClick={() => alCambiar(mesSiguiente(mes))}>
        <Flecha hacia="derecha" />
      </button>
      {mes !== mesActual() && (
        <button type="button" className="boton boton-secundario selector-mes-actual" onClick={() => alCambiar(mesActual())}>
          Ir al mes actual
        </button>
      )}
    </div>
  )
}
