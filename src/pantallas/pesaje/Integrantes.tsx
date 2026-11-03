// Pesaje: quiénes se pesan. Es una lista propia, aparte de las personas del
// grupo (C45), así una mascota nunca aparece en cuentas, gastos ni ingresos.
// Cada uno tiene su objetivo, que da el color de su variación (C61, C62). Quien
// tiene pesajes no se borra: se desactiva, y su historial queda (C48, C49).
import { useId } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Autoria } from "../../componentes/Autoria.tsx";
import { Borrar } from "../../componentes/Borrar.tsx";
import { Campo } from "../../componentes/Campo.tsx";
import { Carga } from "../../componentes/Carga.tsx";
import { Encabezado } from "../../componentes/Encabezado.tsx";
import {
  Formulario,
  type Errores,
  type Valores,
} from "../../componentes/Formulario.tsx";
import { useCambios, useListas } from "../../datos/consultas.ts";
import type { Fila } from "../../datos/repositorio.ts";
import {
  MENSAJE_NO_SE_ENCONTRO,
  MENSAJES_DE_COLUMNA,
  MENSAJES_DE_RESTRICCION,
} from "../../datos/errores.ts";
import { porNombre } from "../../dominio/nombres.ts";
import { etiquetaDeObjetivo, OBJETIVOS } from "../../dominio/pesaje.ts";
import { RUTAS, rutaDeIntegranteDePesaje } from "../../rutas.ts";

type Integrante = Fila<"pesaje_integrante">;

const volverALaLista = {
  a: RUTAS.pesajeIntegrantes,
  texto: "Quiénes se pesan",
};
const REPETIDO =
  MENSAJES_DE_RESTRICCION.pesaje_integrante_nombre_unico?.mensaje;
const OPCIONES_DE_OBJETIVO = OBJETIVOS.map(({ valor, nombre }) => ({
  valor,
  texto: nombre,
}));
const OPCIONES_DE_ACTIVO = [
  { valor: "si", texto: "Aparece" },
  { valor: "no", texto: "No aparece" },
];

/** Pide el nombre y el objetivo, y avisa antes de enviar si el nombre ya está, con la misma regla que la base. */
function validarCon(integrantes: Integrante[], propio?: string) {
  return (valores: Valores): Errores => {
    const nombre = valores.nombre?.trim().toLowerCase() ?? "";
    const repetido = integrantes.some(
      (i) => i.id !== propio && i.nombre.trim().toLowerCase() === nombre,
    );
    return {
      nombre: !nombre
        ? MENSAJES_DE_COLUMNA.nombre
        : repetido
          ? REPETIDO
          : undefined,
      objetivo: valores.objetivo ? undefined : "Elegí el objetivo",
    };
  };
}

function CamposDeIntegrante() {
  return (
    <>
      <Campo nombre="nombre" etiqueta="Nombre" autoComplete="off" />
      <Campo
        nombre="objetivo"
        etiqueta="Objetivo"
        opciones={OPCIONES_DE_OBJETIVO}
        ayuda="Con un objetivo, la variación va en verde si va hacia él y en rojo si no"
      />
    </>
  );
}

export function ListaDeIntegrantes() {
  const cargado = useListas({ integrantes: "pesaje_integrante" });
  const idTitulo = useId();

  return (
    <>
      <Encabezado
        titulo="Quiénes se pesan"
        volver={{ a: RUTAS.pesaje, texto: "Pesaje" }}
        accion={{ a: RUTAS.pesajeIntegranteNuevo, texto: "Agregar a la lista" }}
      />
      <Carga cargado={cargado}>
        {({ integrantes }) =>
          integrantes.length === 0 ? (
            <p className="vacio">
              Todavía no hay nadie en la lista.{" "}
              <Link to={RUTAS.pesajeIntegranteNuevo}>
                Agregá a quien se pesa
              </Link>
            </p>
          ) : (
            <>
              <h2 id={idTitulo} className="solo-lectores">
                Quiénes se pesan
              </h2>
              <ul className="grilla" aria-labelledby={idTitulo}>
                {porNombre(integrantes).map((integrante) => (
                  <li key={integrante.id}>
                    <Link
                      to={rutaDeIntegranteDePesaje(integrante.id)}
                      className="tarjeta tarjeta-enlace"
                    >
                      <span className="tarjeta-titulo">
                        {integrante.nombre}
                      </span>
                      <span className="pildora">
                        {etiquetaDeObjetivo(integrante.objetivo)}
                      </span>
                      {!integrante.activo && (
                        <span className="nota">Desactivado</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </Carga>
    </>
  );
}

export function NuevoIntegrante() {
  const cargado = useListas({ integrantes: "pesaje_integrante" });
  const { crear } = useCambios();
  const navegar = useNavigate();

  return (
    <>
      <Encabezado titulo="Agregar a la lista" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ integrantes }) => (
          <Formulario
            clave="pesaje-integrante-nuevo"
            inicial={{ nombre: "", objetivo: "ninguno" }}
            validar={validarCon(integrantes)}
            guardar={async ({ nombre, objetivo }) => {
              await crear("pesaje_integrante", {
                nombre: nombre.trim(),
                objetivo,
              });
            }}
            alGuardar={() => navegar(RUTAS.pesajeIntegrantes)}
          >
            <CamposDeIntegrante />
          </Formulario>
        )}
      </Carga>
    </>
  );
}

export function EditarIntegrante() {
  const { id = "" } = useParams();
  const cargado = useListas({
    integrantes: "pesaje_integrante",
    personas: "persona",
  });
  const { editar, borrar } = useCambios();
  const navegar = useNavigate();

  return (
    <>
      <Encabezado titulo="Quién se pesa" volver={volverALaLista} />
      <Carga cargado={cargado}>
        {({ integrantes, personas }) => {
          const integrante = integrantes.find((i) => i.id === id);
          if (!integrante) {
            return (
              <p role="alert" className="formulario-error">
                {MENSAJE_NO_SE_ENCONTRO}
              </p>
            );
          }
          return (
            <div className="detalle">
              <Formulario
                key={integrante.id}
                clave={`pesaje-integrante-${integrante.id}`}
                inicial={{
                  nombre: integrante.nombre,
                  objetivo: integrante.objetivo,
                  activo: integrante.activo ? "si" : "no",
                }}
                validar={validarCon(integrantes, integrante.id)}
                guardar={async ({ nombre, objetivo, activo }) => {
                  await editar("pesaje_integrante", integrante.id, {
                    nombre: nombre.trim(),
                    objetivo,
                    activo: activo === "si",
                  });
                }}
                alGuardar={() => navegar(RUTAS.pesajeIntegrantes)}
              >
                <CamposDeIntegrante />
                <Campo
                  nombre="activo"
                  etiqueta="En la carga"
                  opciones={OPCIONES_DE_ACTIVO}
                  ayuda="Si no aparece, sus pesajes anteriores se siguen viendo"
                />
              </Formulario>
              <Autoria fila={integrante} personas={personas} />
              <Borrar
                pregunta={`¿Borrar a ${integrante.nombre} de la lista?`}
                borrar={() => borrar("pesaje_integrante", integrante.id)}
                alBorrar={() => navegar(RUTAS.pesajeIntegrantes)}
              />
            </div>
          );
        }}
      </Carga>
    </>
  );
}
