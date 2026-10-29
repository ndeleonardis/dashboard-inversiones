// La política de privacidad. Se ve sin sesión, porque Google la pide pública y
// enlazada desde la página de inicio para publicar la app de login (T29). Vale
// para cualquier copia: no nombra a ningún grupo ni a quien la administra.
import { Link } from 'react-router'
import { RUTAS } from '../rutas.ts'

export function Privacidad() {
  return (
    <main className="privacidad">
      <Link to={RUTAS.resumen} className="volver">
        <span aria-hidden="true">←</span> Volver
      </Link>
      <h1>Privacidad</h1>
      <p className="privacidad-fecha">Actualizada el 29 de octubre de 2026.</p>
      <p>
        LemonHouse es una app para llevar los ingresos, los gastos y las inversiones de una persona o de un grupo chico.
        Cada grupo usa su propia copia, con su propia base de datos, y la administra alguien del grupo. Solo entran las
        personas que esa persona invitó.
      </p>

      <h2>Qué datos se guardan</h2>
      <ul>
        <li>
          De tu cuenta de Google, tu email, tu nombre y tu foto de perfil, que Google comparte cuando entrás. La app usa
          solo el email.
        </li>
        <li>Lo que el grupo carga en la app: personas, cuentas, instrumentos, compras y ventas, gastos e ingresos.</li>
        <li>Quién cargó o modificó cada cosa y cuándo, con el email de esa persona.</li>
      </ul>

      <h2>Para qué se usan</h2>
      <p>
        El email sirve para saber si estás invitado y para registrar quién cargó cada cosa. Lo que carga el grupo sirve
        para mostrarle sus números dentro de la app. Los datos no se venden, no se usan para publicidad y no se comparten
        con nadie de afuera del grupo.
      </p>

      <h2>Dónde se guardan y quién los ve</h2>
      <p>
        En la base de datos de la copia del grupo, en Supabase, el servicio que da la base y el login. Google solo
        interviene para que entres. Todas las personas invitadas a la copia ven y editan todo lo que se carga ahí.
      </p>

      <h2>Qué queda en tu navegador</h2>
      <p>
        Tu sesión, para que no tengas que entrar cada vez. Si la sesión vence mientras cargás algo, también lo que
        estabas escribiendo, para que no se pierda. Al salir, la app borra las dos cosas. No hay cookies de publicidad
        ni de seguimiento.
      </p>

      <h2>Cómo pedir que se borren tus datos</h2>
      <p>
        Pedíselo a quien administra la copia de tu grupo. Puede sacarte el acceso, borrar tu usuario y borrar lo que se
        cargó sobre vos.
      </p>
    </main>
  )
}
