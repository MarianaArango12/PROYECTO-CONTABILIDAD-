import { useEffect, useState } from 'react';

import { obtenerEmpleados } from '../services/empleados.service.js';
import { obtenerProgramaciones } from '../services/programacion.service.js';
import { obtenerNovedades } from '../services/novedades.service.js';
import { obtenerNominas } from '../services/nomina.service.js';

function Reportes() {
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);

  const [empleados, setEmpleados] = useState([]);
  const [programaciones, setProgramaciones] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [nominas, setNominas] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const reportes = [
    {
      id: 'empleados',
      titulo: 'Reporte de empleados',
      descripcion: 'Consulta los empleados registrados en el sistema.',
      icono: 'bi-people'
    },
    {
      id: 'programaciones',
      titulo: 'Reporte de programaciones',
      descripcion: 'Consulta las programaciones y turnos registrados.',
      icono: 'bi-calendar3'
    },
    {
      id: 'novedades',
      titulo: 'Reporte de novedades',
      descripcion: 'Consulta las novedades registradas de los empleados.',
      icono: 'bi-file-earmark-text'
    },
    {
      id: 'nomina',
      titulo: 'Reporte de nómina',
      descripcion: 'Consulta las nóminas calculadas por período.',
      icono: 'bi-cash-stack'
    }
  ];

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  async function cargarDatosIniciales() {
    try {
      setCargando(true);
      setError('');

      const datosEmpleados = await obtenerEmpleados();

      setEmpleados(
        Array.isArray(datosEmpleados)
          ? datosEmpleados
          : datosEmpleados?.empleados || []
      );
    } catch (error) {
      console.error(error);
      setError(error.message || 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarReporte(id) {
    setReporteSeleccionado(id);
    setError('');

    try {
      setCargando(true);

      if (id === 'empleados') {
        const datos = await obtenerEmpleados();

        setEmpleados(
          Array.isArray(datos)
            ? datos
            : datos?.empleados || []
        );
      }

      if (id === 'programaciones') {
        const datos = await obtenerProgramaciones();

        setProgramaciones(
          Array.isArray(datos)
            ? datos
            : datos?.programaciones || []
        );
      }

      if (id === 'novedades') {
        const datos = await obtenerNovedades();

        setNovedades(
          Array.isArray(datos)
            ? datos
            : datos?.novedades || []
        );
      }

      if (id === 'nomina') {
        const datos = await obtenerNominas();

        setNominas(
          Array.isArray(datos)
            ? datos
            : datos?.nominas || []
        );
      }
    } catch (error) {
      console.error(error);
      setError(
        error.message ||
        'No se pudo cargar el reporte'
      );
    } finally {
      setCargando(false);
    }
  }

  function formatearDinero(valor) {
    const numero = Number(valor ?? 0);

    return numero.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return '-';
    }

    const fechaFormateada = new Date(fecha);

    if (Number.isNaN(fechaFormateada.getTime())) {
      return '-';
    }

    return fechaFormateada.toLocaleDateString('es-CO');
  }

  function obtenerNombreCargo(empleado) {
    return (
      empleado?.cargoCatalogo?.nombre ||
      empleado?.cargo?.nombre ||
      'Sin cargo'
    );
  }

  function obtenerNombreEmpleado(registro) {
    const empleado = registro?.empleado;

    if (!empleado) {
      return 'Sin empleado';
    }

    return `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim();
  }

  function obtenerNombreTurno(programacion) {
    return (
      programacion?.turno?.nombre ||
      'Sin turno'
    );
  }

  function obtenerHoraEntrada(programacion) {
    return (
      programacion?.horaEntrada ||
      programacion?.turno?.horaEntrada ||
      '-'
    );
  }

  function obtenerHoraSalida(programacion) {
    return (
      programacion?.horaSalida ||
      programacion?.turno?.horaSalida ||
      '-'
    );
  }

  function obtenerHoras(programacion) {
    const horas =
      programacion?.horasProgramadas ??
      programacion?.turno?.horasProgramadas;

    if (
      horas === null ||
      horas === undefined ||
      horas === ''
    ) {
      return '-';
    }

    return `${horas} h`;
  }

  function obtenerTipoNovedad(novedad) {
    const tipos = {
      HORA_EXTRA: 'Hora extra',
      HORA_EXTRA_NOCTURNA: 'Hora extra nocturna',
      HORA_EXTRA_DOMINICAL: 'Hora extra dominical',
      HORA_EXTRA_DOMINICAL_NOCTURNA:
        'Hora extra dominical nocturna',
      HORA_EXTRA_FESTIVA: 'Hora extra festiva',
      HORA_EXTRA_FESTIVA_NOCTURNA:
        'Hora extra festiva nocturna',
      RECARGO: 'Recargo',
      DOMINICAL: 'Dominical',
      FESTIVO: 'Festivo',
      CAMBIO_TURNO: 'Cambio de turno',
      LLEGADA_TARDE: 'Llegada tarde',
      INCAPACIDAD: 'Incapacidad',
      SUSPENSION: 'Suspensión',
      PERMISO_NO_REMUNERADO:
        'Permiso no remunerado'
    };

    return tipos[novedad?.tipo] || novedad?.tipo || '-';
  }

  function obtenerDescripcionNovedad(novedad) {
    return (
      novedad?.descripcion ||
      novedad?.observacion ||
      novedad?.detalle ||
      '-'
    );
  }

  function obtenerEstadoClase(estado) {
    if (!estado) {
      return '';
    }

    return estado
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function obtenerEstadoNominaClase(estado) {
    return obtenerEstadoClase(estado);
  }

  return (
    <div className="reportes-container">

      <div className="titulo-reporte">
        <div>
          <h2>Reportes</h2>
          <p>
            Consulta la información principal del sistema contable.
          </p>
        </div>
      </div>

      {/* =========================
          TARJETAS DE REPORTES
      ========================= */}

      <div className="grid-reportes">

        {reportes.map((reporte) => (
          <button
            key={reporte.id}
            type="button"
            className={`tarjeta-reporte ${
              reporteSeleccionado === reporte.id
                ? 'seleccionada'
                : ''
            }`}
            onClick={() => seleccionarReporte(reporte.id)}
          >
            <div className="icono-reporte">
              <i className={`bi ${reporte.icono}`}></i>
            </div>

            <div className="contenido-reporte">
              <h3>{reporte.titulo}</h3>

              <p>{reporte.descripcion}</p>
            </div>

            <i className="bi bi-chevron-right flecha-reporte"></i>
          </button>
        ))}

      </div>

      {/* =========================
          ESTADOS
      ========================= */}

      {cargando && (
        <div className="estado-reporte">
          <i className="bi bi-arrow-repeat"></i>
          <span>Cargando reporte...</span>
        </div>
      )}

      {error && !cargando && (
        <div className="estado-reporte">
          <i className="bi bi-exclamation-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* =========================
          REPORTE DE EMPLEADOS
      ========================= */}

      {reporteSeleccionado === 'empleados' &&
        !cargando &&
        !error && (
          <section className="contenedor-reporte">

            <div className="encabezado-reporte">
              <div>
                <h3>Reporte de empleados</h3>
                <p>
                  {empleados.length} empleado(s) registrado(s)
                </p>
              </div>
            </div>

            {empleados.length === 0 ? (
              <div className="estado-reporte">
                <i className="bi bi-inbox"></i>
                <span>No hay empleados registrados.</span>
              </div>
            ) : (
              <div className="tabla-responsive">

                <table className="tabla-reporte">

                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombres</th>
                      <th>Apellidos</th>
                      <th>Cargo</th>
                      <th>Salario</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {empleados.map((empleado) => (
                      <tr key={empleado.id}>

                        <td>
                          {empleado.documento || '-'}
                        </td>

                        <td>
                          {empleado.nombres || '-'}
                        </td>

                        <td>
                          {empleado.apellidos || '-'}
                        </td>

                        <td>
                          {obtenerNombreCargo(empleado)}
                        </td>

                        <td>
                          {formatearDinero(
                            empleado.salarioBase
                          )}
                        </td>

                        <td>
                          <span
                            className={`estado ${
                              empleado.activo
                                ? 'estado-activo'
                                : ''
                            }`}
                          >
                            {empleado.activo
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </section>
        )}

      {/* =========================
          REPORTE DE PROGRAMACIONES
      ========================= */}

      {reporteSeleccionado === 'programaciones' &&
        !cargando &&
        !error && (
          <section className="contenedor-reporte">

            <div className="encabezado-reporte">
              <div>
                <h3>Reporte de programaciones</h3>
                <p>
                  {programaciones.length} programación(es) registrada(s)
                </p>
              </div>
            </div>

            {programaciones.length === 0 ? (
              <div className="estado-reporte">
                <i className="bi bi-inbox"></i>
                <span>
                  No hay programaciones registradas.
                </span>
              </div>
            ) : (
              <div className="tabla-responsive">

                <table className="tabla-reporte">

                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Empleado</th>
                      <th>Turno</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Horas</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {programaciones.map((programacion) => (
                      <tr key={programacion.id}>

                        <td>
                          {formatearFecha(
                            programacion.fecha
                          )}
                        </td>

                        <td>
                          {obtenerNombreEmpleado(
                            programacion
                          )}
                        </td>

                        <td>
                          {obtenerNombreTurno(
                            programacion
                          )}
                        </td>

                        <td>
                          {obtenerHoraEntrada(
                            programacion
                          )}
                        </td>

                        <td>
                          {obtenerHoraSalida(
                            programacion
                          )}
                        </td>

                        <td>
                          {obtenerHoras(
                            programacion
                          )}
                        </td>

                        <td>
                          <span
                            className={`estado ${obtenerEstadoClase(
                              programacion.estado
                            )}`}
                          >
                            {programacion.estado || '-'}
                          </span>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </section>
        )}

      {/* =========================
          REPORTE DE NOVEDADES
      ========================= */}

      {reporteSeleccionado === 'novedades' &&
        !cargando &&
        !error && (
          <section className="contenedor-reporte">

            <div className="encabezado-reporte">
              <div>
                <h3>Reporte de novedades</h3>
                <p>
                  {novedades.length} novedad(es) registrada(s)
                </p>
              </div>
            </div>

            {novedades.length === 0 ? (
              <div className="estado-reporte">
                <i className="bi bi-inbox"></i>
                <span>
                  No hay novedades registradas.
                </span>
              </div>
            ) : (
              <div className="tabla-responsive">

                <table className="tabla-reporte">

                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Empleado</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {novedades.map((novedad) => (
                      <tr key={novedad.id}>

                        <td>
                          {formatearFecha(
                            novedad.fecha
                          )}
                        </td>

                        <td>
                          {obtenerNombreEmpleado(
                            novedad
                          )}
                        </td>

                        <td>
                          {obtenerTipoNovedad(
                            novedad
                          )}
                        </td>

                        <td>
                          {obtenerDescripcionNovedad(
                            novedad
                          )}
                        </td>

                        <td>
                          <span
                            className={`estado ${obtenerEstadoClase(
                              novedad.estado
                            )}`}
                          >
                            {novedad.estado || '-'}
                          </span>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </section>
        )}

      {/* =========================
          REPORTE DE NÓMINA
      ========================= */}

      {reporteSeleccionado === 'nomina' &&
        !cargando &&
        !error && (
          <section className="contenedor-reporte">

            <div className="encabezado-reporte">
              <div>
                <h3>Reporte de nómina</h3>
                <p>
                  {nominas.length} nómina(s) calculada(s)
                </p>
              </div>
            </div>

            {nominas.length === 0 ? (
              <div className="estado-reporte">
                <i className="bi bi-inbox"></i>
                <span>
                  No hay nóminas calculadas.
                </span>
              </div>
            ) : (
              <div className="tabla-responsive">

                <table className="tabla-reporte tabla-nomina">

                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Empleado</th>
                      <th>Documento</th>
                      <th>Salario base</th>
                      <th>Horas extra</th>
                      <th>Recargos</th>
                      <th>Bonificaciones</th>
                      <th>Descuentos</th>
                      <th>Total devengado</th>
                      <th>Neto a pagar</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>

                    {nominas.map((nomina) => (
                      <tr key={nomina.id}>

                        <td>
                          {formatearFecha(
                            nomina.periodoInicio
                          )}

                          {' - '}

                          {formatearFecha(
                            nomina.periodoFin
                          )}
                        </td>

                        <td>
                          {obtenerNombreEmpleado(
                            nomina
                          )}
                        </td>

                        <td>
                          {nomina.empleado?.documento || '-'}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.salarioBase
                          )}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.horasExtra
                          )}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.recargos
                          )}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.bonificaciones
                          )}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.descuentos
                          )}
                        </td>

                        <td>
                          {formatearDinero(
                            nomina.totalDevengado
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatearDinero(
                              nomina.netoPagar
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`estado ${obtenerEstadoNominaClase(
                              nomina.estado
                            )}`}
                          >
                            {nomina.estado || '-'}
                          </span>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

          </section>
        )}

    </div>
  );
}

export default Reportes;
