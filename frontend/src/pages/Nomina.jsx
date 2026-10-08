import { useEffect, useState } from 'react';

import { obtenerEmpleados } from '../services/empleados.service.js';
import { obtenerProgramacionesPorEmpleado } from '../services/programacion.service.js';
import { obtenerNovedades } from '../services/novedades.service.js';
import { obtenerNominas, crearNomina } from '../services/nomina.service.js';


// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function formatearFecha(fecha) {
  if (!fecha) return '-';

  const fechaTexto = String(fecha).slice(0, 10);

  const [anio, mes, dia] =
    fechaTexto.split('-');

  if (!anio || !mes || !dia) {
    return '-';
  }

  return `${dia}/${mes}/${anio}`;
}


function formatearDinero(valor) {
  const numero =
    Number(valor || 0);

  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}


function mostrarCantidad(valor) {
  return Number(valor || 0).toFixed(2);
}


function obtenerFechaSinHora(fecha) {
  if (!fecha) return '';

  return new Date(fecha)
    .toISOString()
    .slice(0, 10);
}


// ======================================================
// COMPONENTE
// ======================================================

export default function Nomina() {

  const [empleados, setEmpleados] =
    useState([]);

  const [novedades, setNovedades] =
    useState([]);

  const [nominas, setNominas] =
    useState([]);

  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState(null);

  const [programacionesEmpleado, setProgramacionesEmpleado] =
    useState([]);

  const [novedadesEmpleado, setNovedadesEmpleado] =
    useState([]);

  const [periodoInicio, setPeriodoInicio] =
    useState('');

  const [periodoFin, setPeriodoFin] =
    useState('');

  const [busqueda, setBusqueda] =
    useState('');

  const [cargando, setCargando] =
    useState(true);

  const [calculando, setCalculando] =
    useState(false);

  const [error, setError] =
    useState('');

  const [mensaje, setMensaje] =
    useState('');

  const [resultadoNomina, setResultadoNomina] =
    useState(null);

  const [nominaExistente, setNominaExistente] =
    useState(null);


  // ====================================================
  // CARGAR DATOS
  // ====================================================

  useEffect(() => {
    cargarDatos();
  }, []);


  async function cargarDatos() {

    try {

      setCargando(true);
      setError('');

      const [
        empleadosObtenidos,
        novedadesObtenidas,
        nominasObtenidas
      ] = await Promise.all([

        obtenerEmpleados(),

        obtenerNovedades(),

        obtenerNominas()
      ]);


      setEmpleados(
        Array.isArray(empleadosObtenidos)
          ? empleadosObtenidos
          : []
      );


      setNovedades(
        Array.isArray(novedadesObtenidas)
          ? novedadesObtenidas
          : []
      );


      setNominas(
        Array.isArray(nominasObtenidas)
          ? nominasObtenidas
          : []
      );


    } catch (error) {

      console.error(
        'Error cargando datos de nómina:',
        error
      );

      setError(
        error.message ||
        'No se pudieron cargar los datos'
      );

    } finally {

      setCargando(false);

    }
  }


  // ====================================================
  // FILTRAR EMPLEADOS
  // ====================================================

  const empleadosFiltrados =
    empleados.filter(empleado => {

      const texto =
        busqueda
          .toLowerCase()
          .trim();

      if (!texto) {
        return true;
      }

      const nombre =
        `${empleado.nombres || ''} ${empleado.apellidos || ''}`
          .toLowerCase();

      const documento =
        String(
          empleado.documento || ''
        ).toLowerCase();

      return (
        nombre.includes(texto) ||
        documento.includes(texto)
      );
    });


  // ====================================================
  // SELECCIONAR EMPLEADO
  // ====================================================

  function seleccionarEmpleado(empleado) {

    setEmpleadoSeleccionado(
      empleado
    );

    setBusqueda(
      `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim()
    );

    setResultadoNomina(null);

    setNominaExistente(null);

    setProgramacionesEmpleado([]);

    setNovedadesEmpleado([]);

    setMensaje('');

    setError('');
  }


  // ====================================================
  // FILTRAR NOVEDADES DEL EMPLEADO
  // ====================================================

  function filtrarNovedadesEmpleado(
    empleadoId,
    inicio,
    fin
  ) {

    if (
      !empleadoId ||
      !inicio ||
      !fin
    ) {
      return [];
    }


    const fechaInicio =
      new Date(`${inicio}T00:00:00`);

    const fechaFin =
      new Date(`${fin}T23:59:59`);


    return novedades.filter(novedad => {

      if (
        novedad.empleadoId !==
        empleadoId
      ) {
        return false;
      }


      if (
        novedad.estado !==
        'APROBADA'
      ) {
        return false;
      }


      const fechaNovedad =
        new Date(novedad.fecha);


      return (
        fechaNovedad >= fechaInicio &&
        fechaNovedad <= fechaFin
      );
    });
  }


  // ====================================================
  // BUSCAR NÓMINA EXISTENTE
  // ====================================================

  function buscarNominaExistente(
    empleadoId,
    inicio,
    fin
  ) {

    return nominas.find(nomina => {

      const fechaInicio =
        obtenerFechaSinHora(
          nomina.periodoInicio
        );

      const fechaFin =
        obtenerFechaSinHora(
          nomina.periodoFin
        );


      return (
        nomina.empleadoId ===
        empleadoId &&

        fechaInicio ===
        inicio &&

        fechaFin ===
        fin
      );

    }) || null;
  }


  // ====================================================
  // CONSULTAR PERIODO
  // ====================================================

  async function consultarPeriodo() {

    setError('');
    setMensaje('');
    setResultadoNomina(null);
    setNominaExistente(null);


    if (!empleadoSeleccionado) {

      setError(
        'Debe seleccionar un empleado'
      );

      return;
    }


    if (
      !periodoInicio ||
      !periodoFin
    ) {

      setError(
        'Debe seleccionar el período de nómina'
      );

      return;
    }


    if (
      periodoInicio >
      periodoFin
    ) {

      setError(
        'La fecha inicial no puede ser posterior a la fecha final'
      );

      return;
    }


    try {

      const programaciones =
        await obtenerProgramacionesPorEmpleado(
          empleadoSeleccionado.id,
          periodoInicio,
          periodoFin
        );


      setProgramacionesEmpleado(
        Array.isArray(programaciones)
          ? programaciones
          : []
      );


      const novedadesDelPeriodo =
        filtrarNovedadesEmpleado(
          empleadoSeleccionado.id,
          periodoInicio,
          periodoFin
        );


      setNovedadesEmpleado(
        novedadesDelPeriodo
      );


      const nominaEncontrada =
        buscarNominaExistente(
          empleadoSeleccionado.id,
          periodoInicio,
          periodoFin
        );


      if (nominaEncontrada) {

        setNominaExistente(
          nominaEncontrada
        );

        setMensaje(
          'Este período ya tiene una nómina calculada.'
        );

      } else {

        setMensaje(
          'No existe una nómina calculada para este período.'
        );
      }


    } catch (error) {

      console.error(
        'Error consultando período:',
        error
      );

      setError(
        error.message ||
        'No se pudo consultar el período'
      );
    }
  }


  // ====================================================
  // CALCULAR NÓMINA
  // ====================================================

  async function calcularNomina() {

    setError('');
    setMensaje('');


    if (!empleadoSeleccionado) {

      setError(
        'Debe seleccionar un empleado'
      );

      return;
    }


    if (
      !periodoInicio ||
      !periodoFin
    ) {

      setError(
        'Debe seleccionar el período de nómina'
      );

      return;
    }


    if (
      periodoInicio >
      periodoFin
    ) {

      setError(
        'La fecha inicial no puede ser posterior a la fecha final'
      );

      return;
    }


    const nominaEncontrada =
      buscarNominaExistente(
        empleadoSeleccionado.id,
        periodoInicio,
        periodoFin
      );


    if (nominaEncontrada) {

      setNominaExistente(
        nominaEncontrada
      );

      setError(
        'Este período ya tiene una nómina calculada.'
      );

      return;
    }


    try {

      setCalculando(true);


      const datos =
        await crearNomina({

          empleadoId:
            empleadoSeleccionado.id,

          periodoInicio,

          periodoFin
        });


      setResultadoNomina(
        datos
      );

      setNominaExistente(
        null
      );


      setNominas(
        nominasActuales => [
          ...nominasActuales,
          datos.nomina
        ]
      );


      setMensaje(
        'La nómina fue calculada correctamente.'
      );


    } catch (error) {

      console.error(
        'Error calculando nómina:',
        error
      );

      setError(
        error.message ||
        'No se pudo calcular la nómina'
      );

    } finally {

      setCalculando(false);

    }
  }



  // ====================================================
  // RECALCULAR NÓMINA EXISTENTE
  // ====================================================

  async function recalcularNomina() {

    setError('');
    setMensaje('');

    if (!nominaExistente?.id) {

      setError(
        'No hay una nómina para recalcular'
      );

      return;
    }

    try {

      setCalculando(true);

      const token =
        localStorage.getItem('token');

      const respuesta =
        await fetch(
          `http://localhost:3000/api/nominas/${nominaExistente.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }
        );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {

        throw new Error(
          datos.error ||
          'No se pudo recalcular la nómina'
        );
      }

      const nominaActualizada =
        datos.nomina || datos;

      setNominaExistente(
        nominaActualizada
      );

      setNominas(
        nominasActuales =>
          nominasActuales.map(item =>
            item.id === nominaActualizada.id
              ? nominaActualizada
              : item
          )
      );

      setMensaje(
        datos.mensaje ||
        'Nómina recalculada correctamente.'
      );

    } catch (error) {

      console.error(
        'Error recalculando nómina:',
        error
      );

      setError(
        error.message ||
        'No se pudo recalcular la nómina'
      );

    } finally {

      setCalculando(false);

    }
  }

  // ====================================================
  // DATOS DEL RESULTADO
  // ====================================================

  const analisis =
    resultadoNomina?.analisisProgramaciones ||
    {};

  const detalleHorasExtra =
    resultadoNomina?.detalleHorasExtra ||
    {};

  const detalleRecargos =
    resultadoNomina?.detalleRecargos ||
    {};

  /*
   * IMPORTANTE:
   *
   * Los valores monetarios vienen dentro
   * de resultadoNomina.nomina.
   */

  const datosNomina =
    resultadoNomina?.nomina ||
    {};


  // ====================================================
  // VERIFICACIÓN DE PROGRAMACIONES
  // ====================================================

  /*
   * Las horas trabajadas solamente corresponden
   * a programaciones de tipo TRABAJO.
   *
   * Las programaciones DESCANSO no se cuentan
   * como horas trabajadas.
   */

  const horasTrabajadasPeriodo =
    programacionesEmpleado.reduce(
      (total, programacion) => {

        if (
          programacion.tipoProgramacion !==
          'TRABAJO'
        ) {
          return total;
        }

        return (
          total +
          Number(
            programacion.horasProgramadas || 0
          )
        );
      },
      0
    );


  const cantidadDiasTrabajo =
    programacionesEmpleado.filter(
      programacion =>
        programacion.tipoProgramacion ===
        'TRABAJO'
    ).length;


  const cantidadDiasDescanso =
    programacionesEmpleado.filter(
      programacion =>
        programacion.tipoProgramacion ===
        'DESCANSO'
    ).length;


  // ====================================================
  // RENDER
  // ====================================================

  if (cargando) {

    return (
      <div className="container py-4">

        <div className="text-center">

          <div
            className="spinner-border"
            role="status"
          />

          <p className="mt-2">
            Cargando información de nómina...
          </p>

        </div>

      </div>
    );
  }


  return (

    <div className="container-fluid py-4">

      {/* ==================================================
          TÍTULO
      ================================================== */}

      <div className="mb-4">

        <h2 className="fw-bold">
          Nómina
        </h2>

        <p className="text-muted mb-0">
          Cálculo y consulta de nómina de empleados
        </p>

      </div>


      {/* ==================================================
          MENSAJES
      ================================================== */}

      {error && (

        <div
          className="alert alert-danger"
          role="alert"
        >

          {error}

        </div>
      )}


      {mensaje && (

        <div
          className="alert alert-info"
          role="alert"
        >

          {mensaje}

        </div>
      )}


      {/* ==================================================
          SELECCIÓN
      ================================================== */}

      <div className="card shadow-sm mb-4">

        <div className="card-body">

          <h5 className="card-title mb-3">
            Seleccionar empleado
          </h5>


          <div className="row g-3">

            <div className="col-md-6">

              <label className="form-label">
                Empleado
              </label>

              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre o documento"
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
              />


              {busqueda && !empleadoSeleccionado && (

                <div className="list-group mt-1">

                  {empleadosFiltrados.map(
                    empleado => (

                      <button
                        key={empleado.id}
                        type="button"
                        className="list-group-item list-group-item-action"
                        onClick={() =>
                          seleccionarEmpleado(
                            empleado
                          )
                        }
                      >

                        <strong>
                          {empleado.nombres}{' '}
                          {empleado.apellidos}
                        </strong>

                        <div className="small text-muted">

                          Documento:{' '}
                          {empleado.documento}

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>


            <div className="col-md-3">

              <label className="form-label">
                Período inicio
              </label>

              <input
                type="date"
                className="form-control"
                value={periodoInicio}
                onChange={(e) =>
                  setPeriodoInicio(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="col-md-3">

              <label className="form-label">
                Período fin
              </label>

              <input
                type="date"
                className="form-control"
                value={periodoFin}
                onChange={(e) =>
                  setPeriodoFin(
                    e.target.value
                  )
                }
              />

            </div>

          </div>


          {empleadoSeleccionado && (

            <div className="mt-3 p-3 border rounded">

              <div className="row">

                <div className="col-md-6">

                  <strong>
                    Empleado:
                  </strong>{' '}

                  {empleadoSeleccionado.nombres}{' '}
                  {empleadoSeleccionado.apellidos}

                </div>


                <div className="col-md-3">

                  <strong>
                    Documento:
                  </strong>{' '}

                  {empleadoSeleccionado.documento}

                </div>


                <div className="col-md-3">

                  <strong>
                    Salario base:
                  </strong>{' '}

                  {formatearDinero(
                    empleadoSeleccionado.salarioBase
                  )}

                </div>

              </div>

            </div>
          )}


          <div className="mt-3 d-flex gap-2">

            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={consultarPeriodo}
              disabled={
                !empleadoSeleccionado ||
                !periodoInicio ||
                !periodoFin
              }
            >
              Consultar período
            </button>


            <button
              type="button"
              className="btn btn-primary"
              onClick={calcularNomina}
              disabled={
                calculando ||
                !empleadoSeleccionado ||
                !periodoInicio ||
                !periodoFin
              }
            >

              {calculando
                ? 'Calculando...'
                : 'Calcular nómina'}

            </button>

          </div>

        </div>

      </div>


      {/* ==================================================
          PROGRAMACIONES
      ================================================== */}

      {programacionesEmpleado.length > 0 && (

        <div className="card shadow-sm mb-4">

          <div className="card-header">

            <h5 className="mb-0">
              Verificación de programaciones
            </h5>

          </div>


          <div className="card-body">

            <p className="text-muted mb-3">
              Revise las programaciones del período antes
              de calcular la nómina. Los descansos no se
              cuentan como horas trabajadas.
            </p>


            <div className="table-responsive">

              <table className="table table-bordered table-sm align-middle">

                <thead>

                  <tr>

                    <th>
                      Fecha
                    </th>

                    <th>
                      Turno
                    </th>

                    <th>
                      Tipo
                    </th>

                    <th>
                      Estado
                    </th>

                    <th className="text-end">
                      Horas
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {programacionesEmpleado.map(
                    programacion => (

                      <tr
                        key={
                          programacion.id
                        }
                      >

                        <td>
                          {formatearFecha(
                            programacion.fecha
                          )}
                        </td>

                        <td>
                          {
                            programacion.turno?.nombre ||
                            '-'
                          }
                        </td>

                        <td>

                          {programacion.tipoProgramacion === 'DESCANSO'
                            ? 'DESCANSO'
                            : 'TRABAJO'}

                        </td>

                        <td>
                          {
                            programacion.estado ||
                            '-'
                          }
                        </td>

                        <td className="text-end">

                          {mostrarCantidad(
                            programacion.tipoProgramacion === 'DESCANSO'
                              ? 0
                              : programacion.horasProgramadas
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>


                <tfoot>

                  <tr>

                    <th
                      colSpan="4"
                      className="text-end"
                    >
                      TOTAL HORAS TRABAJADAS
                    </th>

                    <th className="text-end">
                      {mostrarCantidad(
                        horasTrabajadasPeriodo
                      )}
                    </th>

                  </tr>

                </tfoot>

              </table>

            </div>


            {/* ==================================================
                RESUMEN DE VERIFICACIÓN
            ================================================== */}

            <div className="row g-3 mt-2">

              <div className="col-md-4">

                <div className="border rounded p-3">

                  <div className="text-muted">
                    Días de trabajo
                  </div>

                  <div className="fs-5 fw-bold">
                    {cantidadDiasTrabajo}
                  </div>

                </div>

              </div>


              <div className="col-md-4">

                <div className="border rounded p-3">

                  <div className="text-muted">
                    Horas trabajadas
                  </div>

                  <div className="fs-5 fw-bold">
                    {mostrarCantidad(
                      horasTrabajadasPeriodo
                    )}
                  </div>

                </div>

              </div>


              <div className="col-md-4">

                <div className="border rounded p-3">

                  <div className="text-muted">
                    Días de descanso
                  </div>

                  <div className="fs-5 fw-bold">
                    {cantidadDiasDescanso}
                  </div>

                </div>

              </div>

            </div>


            {/* ==================================================
                COMPARACIÓN CON EL CÁLCULO
            ================================================== */}

            {resultadoNomina && (

              <div className="alert alert-secondary mt-3 mb-0">

                <div className="fw-bold mb-2">
                  Comparación con la nómina calculada
                </div>

                <div className="row g-2">

                  <div className="col-md-4">

                    Horas según programación:{' '}

                    <strong>
                      {mostrarCantidad(
                        horasTrabajadasPeriodo
                      )}
                    </strong>

                  </div>


                  <div className="col-md-4">

                    Horas según cálculo:{' '}

                    <strong>
                      {mostrarCantidad(
                        analisis.totalHorasProgramadas
                      )}
                    </strong>

                  </div>


                  <div className="col-md-4">

                    Diferencia:{' '}

                    <strong>
                      {mostrarCantidad(
                        horasTrabajadasPeriodo -
                        Number(
                          analisis.totalHorasProgramadas || 0
                        )
                      )}
                    </strong>

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>
      )}


      {/* ==================================================
          NOVEDADES
      ================================================== */}

      {novedadesEmpleado.length > 0 && (

        <div className="card shadow-sm mb-4">

          <div className="card-body">

            <h5 className="card-title mb-3">
              Novedades aprobadas
            </h5>


            <div className="table-responsive">

              <table className="table table-bordered table-sm">

                <thead>

                  <tr>

                    <th>
                      Fecha
                    </th>

                    <th>
                      Categoría
                    </th>

                    <th>
                      Tipo
                    </th>

                    <th>
                      Cantidad
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {novedadesEmpleado.map(
                    novedad => (

                      <tr
                        key={
                          novedad.id
                        }
                      >

                        <td>
                          {formatearFecha(
                            novedad.fecha
                          )}
                        </td>

                        <td>
                          {
                            novedad.categoria ||
                            '-'
                          }
                        </td>

                        <td>
                          {
                            novedad.tipo ||
                            '-'
                          }
                        </td>

                        <td>
                          {mostrarCantidad(
                            novedad.cantidad
                          )}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>
      )}


      {/* ==================================================
          NÓMINA EXISTENTE
      ================================================== */}

      {nominaExistente && (

        <div className="card shadow-sm mb-4">

          <div className="card-header">

            <div className="d-flex justify-content-between align-items-center">

              <h5 className="mb-0">
                Nómina existente
              </h5>

              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={recalcularNomina}
                disabled={calculando}
              >
                {calculando
                  ? 'Recalculando...'
                  : 'Recalcular nómina'}
              </button>

            </div>

          </div>


          <div className="card-body">

            <div className="row g-3">

              <div className="col-md-4">

                <strong>
                  Período:
                </strong>

                <div>
                  {formatearFecha(
                    nominaExistente.periodoInicio
                  )}{' '}
                  -{' '}
                  {formatearFecha(
                    nominaExistente.periodoFin
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Estado:
                </strong>

                <div>
                  {nominaExistente.estado}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Salario base:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.salarioBase
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Horas extra:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.horasExtra
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Recargos:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.recargos
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Bonificaciones:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.bonificaciones
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Descuentos:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.descuentos
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Total devengado:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.totalDevengado
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Total deducciones:
                </strong>

                <div>
                  {formatearDinero(
                    nominaExistente.totalDeducciones
                  )}
                </div>

              </div>


              <div className="col-md-4">

                <strong>
                  Neto a pagar:
                </strong>

                <div className="fw-bold">
                  {formatearDinero(
                    nominaExistente.netoPagar
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      )}


      {/* ==================================================
          RESULTADO DE LA NÓMINA CALCULADA
      ================================================== */}

      {resultadoNomina && (

        <>

          {/* ==================================================
              RESUMEN DE HORAS
          ================================================== */}

          <div className="card shadow-sm mb-4">

            <div className="card-header">

              <h5 className="mb-0">
                Resumen de horas
              </h5>

            </div>


            <div className="card-body">

              <div className="row g-3">

                <div className="col-md-3">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas programadas
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.totalHorasProgramadas
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-3">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas calculadas
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.totalHorasCalculadas
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-3">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas ordinarias
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.horasOrdinarias
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-3">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas extra
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.horasExtraTotales
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas domingo
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.totalHorasDomingo
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas nocturnas
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.totalHorasNocturnas
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Descanso remunerado
                    </div>

                    <div className="fs-4 fw-bold">
                      {mostrarCantidad(
                        analisis.totalHorasDescansoRemunerado
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              CONCEPTOS
          ================================================== */}

          <div className="card shadow-sm mb-4">

            <div className="card-header">

              <h5 className="mb-0">
                Conceptos de nómina
              </h5>

            </div>


            <div className="card-body">

              <div className="table-responsive">

                <table className="table table-bordered">

                  <thead>

                    <tr>

                      <th>
                        Concepto
                      </th>

                      <th>
                        Horas
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    <tr>

                      <td>
                        H.O
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.horasOrdinarias
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        ED
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.horasExtraDiurnas
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        EN
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.horasExtraNocturnas
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        ED.F
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.horasExtraDiurnasFestivas
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        EN.F
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.horasExtraNocturnasFestivas
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        RN
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.recargoNocturno
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        RF
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.recargoFestivo
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>
                        RNF
                      </td>

                      <td>
                        {mostrarCantidad(
                          analisis.recargoNocturnoFestivo
                        )}
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </div>

          </div>


          {/* ==================================================
              LIQUIDACIÓN
          ================================================== */}

          <div className="card shadow-sm mb-4">

            <div className="card-header">

              <h5 className="mb-0">
                Liquidación
              </h5>

            </div>


            <div className="card-body">

              <div className="row g-3">

                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Salario base
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.salarioBase
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Horas extra
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.horasExtra
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Recargos
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.recargos
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Bonificaciones
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.bonificaciones
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Descuentos
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.descuentos
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Total devengado
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.totalDevengado
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="text-muted">
                      Total deducciones
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatearDinero(
                        datosNomina.totalDeducciones
                      )}
                    </div>

                  </div>

                </div>


                <div className="col-md-4">

                  <div className="border rounded p-3">

                    <div className="border rounded p-3">

                      <div className="text-muted">
                        Neto a pagar
                      </div>

                      <div className="fs-4 fw-bold">
                        {formatearDinero(
                          datosNomina.netoPagar
                        )}
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              DETALLE HORAS EXTRA
          ================================================== */}

          <div className="card shadow-sm mb-4">

            <div className="card-header">

              <h5 className="mb-0">
                Detalle horas extra
              </h5>

            </div>


            <div className="card-body">

              <div className="row g-3">

                <div className="col-md-4">

                  <strong>
                    Cantidad de horas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleHorasExtra.cantidadHoras
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas diurnas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleHorasExtra.horasDiurnas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas nocturnas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleHorasExtra.horasNocturnas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas diurnas festivas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleHorasExtra.horasDiurnasFestivas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas nocturnas festivas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleHorasExtra.horasNocturnasFestivas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Valor total:
                  </strong>

                  <div>
                    {formatearDinero(
                      detalleHorasExtra.valorTotal
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              DETALLE RECARGOS
          ================================================== */}

          <div className="card shadow-sm mb-4">

            <div className="card-header">

              <h5 className="mb-0">
                Detalle recargos
              </h5>

            </div>


            <div className="card-body">

              <div className="row g-3">

                <div className="col-md-4">

                  <strong>
                    Horas nocturnas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleRecargos.totalHorasNocturnas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas festivas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleRecargos.totalHorasFestivas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Horas nocturnas festivas:
                  </strong>

                  <div>
                    {mostrarCantidad(
                      detalleRecargos.totalHorasNocturnasFestivas
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Valor nocturno:
                  </strong>

                  <div>
                    {formatearDinero(
                      detalleRecargos.valorNocturno
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Valor festivo:
                  </strong>

                  <div>
                    {formatearDinero(
                      detalleRecargos.valorFestivo
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Valor nocturno festivo:
                  </strong>

                  <div>
                    {formatearDinero(
                      detalleRecargos.valorNocturnoFestivo
                    )}
                  </div>

                </div>


                <div className="col-md-4">

                  <strong>
                    Valor total:
                  </strong>

                  <div>
                    {formatearDinero(
                      detalleRecargos.valorTotal
                    )}
                  </div>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              INCAPACIDADES
          ================================================== */}

          {resultadoNomina.incapacidad && (

            <div className="card shadow-sm mb-4">

              <div className="card-header">

                <h5 className="mb-0">
                  Incapacidades
                </h5>

              </div>


              <div className="card-body">

                <div className="row g-3">

                  <div className="col-md-4">

                    <strong>
                      Días de incapacidad:
                    </strong>

                    <div>
                      {mostrarCantidad(
                        resultadoNomina.incapacidad.cantidadDias
                      )}
                    </div>

                  </div>


                  <div className="col-md-4">

                    <strong>
                      Valor por día:
                    </strong>

                    <div>
                      {formatearDinero(
                        resultadoNomina.incapacidad.valorDia
                      )}
                    </div>

                  </div>


                  <div className="col-md-4">

                    <strong>
                      Valor total:
                    </strong>

                    <div>
                      {formatearDinero(
                        resultadoNomina.incapacidad.valorTotal
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

        </>
      )}

    </div>
  );
}