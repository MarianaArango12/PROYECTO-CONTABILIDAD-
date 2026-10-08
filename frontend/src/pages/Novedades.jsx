import { useEffect, useState } from 'react';

import {
  obtenerNovedades,
  crearNovedad,
  aprobarNovedad,
  rechazarNovedad,
} from '../services/novedades.service.js';

import { obtenerEmpleados } from '../services/empleados.service.js';

const TIPOS_NOVEDAD = {
  OPERATIVA: [
    {
      value: 'CAMBIO_TURNO',
      label: 'Cambio de turno',
    },
    {
      value: 'REPROGRAMACION',
      label: 'Reprogramación',
    },
    {
      value: 'COBERTURA_TURNO',
      label: 'Cobertura de turno',
    },
    {
      value: 'AUSENCIA_OPERATIVA',
      label: 'Ausencia operativa',
    },
    {
      value: 'LLEGADA_TARDE',
      label: 'Llegada tarde',
    },
    {
      value: 'RETIRO_ANTICIPADO',
      label: 'Retiro anticipado',
    },
    {
      value: 'CAMBIO_PUESTO',
      label: 'Cambio de puesto',
    },
  ],

  LABORAL: [
    {
      value: 'HORA_EXTRA',
      label: 'Hora extra diurna',
    },
    {
      value: 'HORA_EXTRA_NOCTURNA',
      label: 'Hora extra nocturna',
    },
    {
      value: 'HORA_EXTRA_DOMINICAL',
      label: 'Hora extra dominical diurna',
    },
    {
      value: 'HORA_EXTRA_DOMINICAL_NOCTURNA',
      label: 'Hora extra dominical nocturna',
    },
    {
      value: 'HORA_EXTRA_FESTIVA',
      label: 'Hora extra festiva diurna',
    },
    {
      value: 'HORA_EXTRA_FESTIVA_NOCTURNA',
      label: 'Hora extra festiva nocturna',
    },
    {
      value: 'RECARGO',
      label: 'Recargo nocturno',
    },
    {
      value: 'DOMINICAL',
      label: 'Recargo dominical',
    },
    {
      value: 'FESTIVO',
      label: 'Recargo festivo',
    },
    {
      value: 'INCAPACIDAD',
      label: 'Incapacidad',
    },
    {
      value: 'PERMISO',
      label: 'Permiso',
    },
    {
      value: 'AUSENCIA',
      label: 'Ausencia',
    },
    {
      value: 'BONIFICACION',
      label: 'Bonificación',
    },
    {
      value: 'DESCUENTO',
      label: 'Descuento',
    },
    {
      value: 'OTRA',
      label: 'Otra',
    },
  ],
};

const NOMBRES_TIPOS = {
  CAMBIO_TURNO: 'Cambio de turno',
  REPROGRAMACION: 'Reprogramación',
  COBERTURA_TURNO: 'Cobertura de turno',
  AUSENCIA_OPERATIVA: 'Ausencia operativa',
  LLEGADA_TARDE: 'Llegada tarde',
  RETIRO_ANTICIPADO: 'Retiro anticipado',
  CAMBIO_PUESTO: 'Cambio de puesto',

  HORA_EXTRA: 'Hora extra diurna',
  HORA_EXTRA_NOCTURNA: 'Hora extra nocturna',
  HORA_EXTRA_DOMINICAL: 'Hora extra dominical diurna',
  HORA_EXTRA_DOMINICAL_NOCTURNA:
    'Hora extra dominical nocturna',
  HORA_EXTRA_FESTIVA: 'Hora extra festiva diurna',
  HORA_EXTRA_FESTIVA_NOCTURNA:
    'Hora extra festiva nocturna',

  RECARGO: 'Recargo nocturno',
  DOMINICAL: 'Recargo dominical',
  FESTIVO: 'Recargo festivo',

  INCAPACIDAD: 'Incapacidad',
  PERMISO: 'Permiso',
  AUSENCIA: 'Ausencia',
  BONIFICACION: 'Bonificación',
  DESCUENTO: 'Descuento',
  OTRA: 'Otra',
};

const NOMBRES_CATEGORIAS = {
  OPERATIVA: 'Operativa',
  LABORAL: 'Laboral',
};

function formatearFecha(fecha) {
  if (!fecha) {
    return '-';
  }

  return new Date(fecha).toLocaleDateString('es-CO');
}

function formatearEstado(estado) {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';

    case 'APROBADA':
      return 'Aprobada';

    case 'RECHAZADA':
      return 'Rechazada';

    default:
      return estado || '-';
  }
}

function obtenerClaseEstado(estado) {
  switch (estado) {
    case 'APROBADA':
      return 'estado-aprobada';

    case 'RECHAZADA':
      return 'estado-rechazada';

    case 'PENDIENTE':
      return 'estado-pendiente';

    default:
      return '';
  }
}

function Novedades() {
  const [empleados, setEmpleados] = useState([]);
  const [novedades, setNovedades] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Filtros de la tabla
  const [empleadoFiltro, setEmpleadoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('TODOS');

  const [formulario, setFormulario] = useState({
    empleadoId: '',
    categoria: '',
    tipo: '',
    fecha: '',
    cantidad: '',
    observacion: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError('');

      const [datosEmpleados, datosNovedades] =
        await Promise.all([
          obtenerEmpleados(),
          obtenerNovedades(),
        ]);

      setEmpleados(
        Array.isArray(datosEmpleados)
          ? datosEmpleados
          : []
      );

      setNovedades(
        Array.isArray(datosNovedades)
          ? datosNovedades
          : []
      );
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          'No se pudieron cargar los datos'
      );
    } finally {
      setCargando(false);
    }
  }

  function manejarCambio(e) {
    const { name, value } = e.target;

    if (name === 'categoria') {
      setFormulario((anterior) => ({
        ...anterior,
        categoria: value,
        tipo: '',
      }));

      return;
    }

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();

    setError('');
    setMensaje('');

    if (
      !formulario.empleadoId ||
      !formulario.categoria ||
      !formulario.tipo ||
      !formulario.fecha
    ) {
      setError(
        'Empleado, categoría, tipo y fecha son obligatorios.'
      );

      return;
    }

    try {
      setGuardando(true);

      const datos = {
        empleadoId: formulario.empleadoId,
        categoria: formulario.categoria,
        tipo: formulario.tipo,
        fecha: formulario.fecha,

        cantidad:
          formulario.cantidad === ''
            ? null
            : Number(formulario.cantidad),

        observacion:
          formulario.observacion.trim() || null,
      };

      await crearNovedad(datos);

      setMensaje(
        'La novedad fue registrada correctamente.'
      );

      // Después de registrar, mostramos las novedades
      // del empleado que acabamos de seleccionar.
      setEmpleadoFiltro(formulario.empleadoId);

      setFormulario({
        empleadoId: '',
        categoria: '',
        tipo: '',
        fecha: '',
        cantidad: '',
        observacion: '',
      });

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          'No se pudo registrar la novedad.'
      );
    } finally {
      setGuardando(false);
    }
  }

  async function manejarAprobar(id) {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas aprobar esta novedad?'
    );

    if (!confirmar) {
      return;
    }

    try {
      setError('');
      setMensaje('');

      await aprobarNovedad(id);

      setMensaje(
        'La novedad fue aprobada correctamente.'
      );

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          'No se pudo aprobar la novedad.'
      );
    }
  }

  async function manejarRechazar(id) {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas rechazar esta novedad?'
    );

    if (!confirmar) {
      return;
    }

    try {
      setError('');
      setMensaje('');

      await rechazarNovedad(id);

      setMensaje(
        'La novedad fue rechazada correctamente.'
      );

      await cargarDatos();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          'No se pudo rechazar la novedad.'
      );
    }
  }

  const tiposDisponibles =
    formulario.categoria
      ? TIPOS_NOVEDAD[formulario.categoria] || []
      : [];

  // Filtrar novedades para la tabla
  const novedadesFiltradas = novedades.filter(
    (novedad) => {
      const coincideEmpleado =
        !empleadoFiltro ||
        novedad.empleadoId === empleadoFiltro;

      const coincideEstado =
        estadoFiltro === 'TODOS' ||
        novedad.estado === estadoFiltro;

      return (
        coincideEmpleado &&
        coincideEstado
      );
    }
  );

  const empleadoSeleccionado = empleados.find(
    (empleado) =>
      empleado.id === empleadoFiltro
  );

  return (
    <div className="pagina-novedades">

      <div className="encabezado-pagina">
        <div>
          <h2>Novedades</h2>

          <p>
            Registro y gestión de novedades laborales y
            operativas
          </p>
        </div>
      </div>

      {error && (
        <div className="mensaje mensaje-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje mensaje-exito">
          {mensaje}
        </div>
      )}

      {/* REGISTRAR NOVEDAD */}
      <div className="tarjeta">
        <h3>Registrar novedad</h3>

        <form onSubmit={manejarSubmit}>
          <div className="formulario-grid">

            <div className="campo">
              <label htmlFor="empleadoId">
                Empleado
              </label>

              <select
                id="empleadoId"
                name="empleadoId"
                value={formulario.empleadoId}
                onChange={manejarCambio}
                required
              >
                <option value="">
                  Selecciona un empleado
                </option>

                {empleados.map((empleado) => (
                  <option
                    key={empleado.id}
                    value={empleado.id}
                  >
                    {empleado.nombres}{' '}
                    {empleado.apellidos}
                    {' - '}
                    {empleado.documento}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="categoria">
                Categoría
              </label>

              <select
                id="categoria"
                name="categoria"
                value={formulario.categoria}
                onChange={manejarCambio}
                required
              >
                <option value="">
                  Selecciona una categoría
                </option>

                <option value="OPERATIVA">
                  Operativa
                </option>

                <option value="LABORAL">
                  Laboral
                </option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="tipo">
                Tipo de novedad
              </label>

              <select
                id="tipo"
                name="tipo"
                value={formulario.tipo}
                onChange={manejarCambio}
                disabled={!formulario.categoria}
                required
              >
                <option value="">
                  {formulario.categoria
                    ? 'Selecciona un tipo'
                    : 'Primero selecciona una categoría'}
                </option>

                {tiposDisponibles.map((tipo) => (
                  <option
                    key={tipo.value}
                    value={tipo.value}
                  >
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="fecha">
                Fecha
              </label>

              <input
                id="fecha"
                name="fecha"
                type="date"
                value={formulario.fecha}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="cantidad">
                Cantidad
              </label>

              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="0"
                step="0.01"
                value={formulario.cantidad}
                onChange={manejarCambio}
                placeholder="Ej: 4"
              />

              <small>
                Horas, días o valor según el tipo de
                novedad.
              </small>
            </div>

            <div className="campo campo-completo">
              <label htmlFor="observacion">
                Observación
              </label>

              <textarea
                id="observacion"
                name="observacion"
                value={formulario.observacion}
                onChange={manejarCambio}
                placeholder="Agrega una observación si es necesario"
                rows="3"
              />
            </div>
          </div>

          <div className="acciones-formulario">
            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : 'Registrar novedad'}
            </button>
          </div>
        </form>
      </div>

      {/* CONSULTAR NOVEDADES */}
      <div className="tarjeta">

        <div className="titulo-tabla">
          <div>
            <h3>Novedades registradas</h3>

            <p>
              Consulta las novedades de cada empleado.
            </p>
          </div>

          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>

        {/* FILTROS */}
        <div className="formulario-grid">

          <div className="campo">
            <label htmlFor="empleadoFiltro">
              Empleado
            </label>

            <select
              id="empleadoFiltro"
              value={empleadoFiltro}
              onChange={(e) =>
                setEmpleadoFiltro(e.target.value)
              }
            >
              <option value="">
                Todos los empleados
              </option>

              {empleados.map((empleado) => (
                <option
                  key={empleado.id}
                  value={empleado.id}
                >
                  {empleado.nombres}{' '}
                  {empleado.apellidos}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="estadoFiltro">
              Estado
            </label>

            <select
              id="estadoFiltro"
              value={estadoFiltro}
              onChange={(e) =>
                setEstadoFiltro(e.target.value)
              }
            >
              <option value="TODOS">
                Todos los estados
              </option>

              <option value="PENDIENTE">
                Pendientes
              </option>

              <option value="APROBADA">
                Aprobadas
              </option>

              <option value="RECHAZADA">
                Rechazadas
              </option>
            </select>
          </div>

        </div>

        {/* EMPLEADO SELECCIONADO */}
        {empleadoSeleccionado && (
          <div className="mensaje mensaje-info">
            Mostrando novedades de:{' '}
            <strong>
              {empleadoSeleccionado.nombres}{' '}
              {empleadoSeleccionado.apellidos}
            </strong>
          </div>
        )}

        {cargando ? (
          <p>Cargando novedades...</p>
        ) : novedadesFiltradas.length === 0 ? (
          <div className="sin-datos">
            <p>
              {empleadoFiltro
                ? 'Este empleado no tiene novedades con los filtros seleccionados.'
                : 'No hay novedades registradas.'}
            </p>
          </div>
        ) : (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Observación</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {novedadesFiltradas.map(
                  (novedad) => (
                    <tr key={novedad.id}>

                      <td>
                        {novedad.empleado
                          ? `${novedad.empleado.nombres} ${novedad.empleado.apellidos}`
                          : 'Empleado no disponible'}
                      </td>

                      <td>
                        {NOMBRES_CATEGORIAS[
                          novedad.categoria
                        ] || novedad.categoria}
                      </td>

                      <td>
                        {NOMBRES_TIPOS[
                          novedad.tipo
                        ] || novedad.tipo}
                      </td>

                      <td>
                        {formatearFecha(
                          novedad.fecha
                        )}
                      </td>

                      <td>
                        {novedad.cantidad ?? '-'}
                      </td>

                      <td>
                        <span
                          className={`estado ${obtenerClaseEstado(
                            novedad.estado
                          )}`}
                        >
                          {formatearEstado(
                            novedad.estado
                          )}
                        </span>
                      </td>

                      <td>
                        {novedad.observacion || '-'}
                      </td>

                      <td>
                        {novedad.estado ===
                        'PENDIENTE' ? (
                          <div className="acciones-tabla">

                            <button
                              type="button"
                              onClick={() =>
                                manejarAprobar(
                                  novedad.id
                                )
                              }
                            >
                              Aprobar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                manejarRechazar(
                                  novedad.id
                                )
                              }
                            >
                              Rechazar
                            </button>

                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default Novedades;
