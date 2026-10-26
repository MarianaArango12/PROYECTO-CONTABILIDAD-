
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

import { obtenerEmpleados } from '../services/empleados.service'
import { obtenerNominas } from '../services/nomina.service'
import { obtenerNovedades } from '../services/novedades.service'
import { obtenerProgramaciones } from '../services/programacion.service'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function obtenerUsuario() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    return {
      nombre:
        usuario.nombre ||
        usuario.nombres ||
        'Usuario',
      rol:
        typeof usuario.rol === 'string'
          ? usuario.rol
          : usuario.rol?.nombre || 'Usuario autorizado',
    }
  } catch {
    return {
      nombre: 'Usuario',
      rol: 'Usuario autorizado',
    }
  }
}


function obtenerPeriodoSeleccionado(mesSeleccionado, quincenaSeleccionada) {
  const [anio, mes] = mesSeleccionado.split('-').map(Number)

  const inicio = new Date(
    anio,
    mes - 1,
    quincenaSeleccionada === '1' ? 1 : 16
  )

  const fin =
    quincenaSeleccionada === '1'
      ? new Date(anio, mes - 1, 15)
      : new Date(anio, mes, 0)

  return { inicio, fin }
}


function fechaClave(fecha) {
  if (!fecha) return ''

  const valor = String(fecha)
  return valor.slice(0, 10)
}

function fechaLocalClave(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function obtenerNombreEmpleado(registro) {
  const empleado = registro?.empleado

  if (!empleado) return 'Empleado'

  return (
    `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim() ||
    'Empleado'
  )
}

function obtenerFechaActividad(registro) {
  return registro?.creadoEn || registro?.actualizadoEn || null
}

function obtenerActividad(nominas, novedades) {
  const movimientosNomina = nominas.map((nomina) => ({
    id: `nomina-${nomina.id}`,
    titulo: 'Nómina registrada',
    descripcion: `${obtenerNombreEmpleado(nomina)} · Estado: ${nomina.estado}`,
    fecha: obtenerFechaActividad(nomina),
    icono: 'bi-receipt',
    ruta: '/nomina',
  }))

  const movimientosNovedad = novedades.map((novedad) => ({
    id: `novedad-${novedad.id}`,
    titulo: 'Novedad registrada',
    descripcion: `${obtenerNombreEmpleado(novedad)} · Estado: ${novedad.estado}`,
    fecha: obtenerFechaActividad(novedad),
    icono: 'bi-clipboard-check',
    ruta: '/novedades',
  }))

  return [...movimientosNomina, ...movimientosNovedad]
    .filter((movimiento) => movimiento.fecha)
    .sort(
      (a, b) =>
        new Date(b.fecha).getTime() -
        new Date(a.fecha).getTime()
    )
    .slice(0, 5)
}

function TarjetaEstadistica({
  titulo,
  valor,
  descripcion,
  icono,
  color,
  cargando,
  error,
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="text-secondary mb-2">{titulo}</p>
              <h3 className="fw-bold mb-1">
                {cargando ? '...' : error ? '—' : valor}
              </h3>
            </div>

            <div
              className={`rounded-3 bg-${color}-subtle text-${color} d-flex align-items-center justify-content-center`}
              style={{ width: 48, height: 48 }}
            >
              <i className={`bi ${icono} fs-4`}></i>
            </div>
          </div>

          <small className="text-secondary">
            {error ? 'No disponible para este usuario' : descripcion}
          </small>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const usuario = obtenerUsuario()

  const [datos, setDatos] = useState({
    empleados: null,
    nominas: null,
    novedades: null,
    programaciones: null,
  })

  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState({})

  useEffect(() => {
    let activo = true

    async function cargarDashboard() {
      setCargando(true)

      const consultas = await Promise.allSettled([
        obtenerEmpleados(),
        obtenerNominas(),
        obtenerNovedades(),
        obtenerProgramaciones(),
      ])

      if (!activo) return

      const nombres = [
        'empleados',
        'nominas',
        'novedades',
        'programaciones',
      ]

      const nuevosDatos = {}
      const nuevosErrores = {}

      consultas.forEach((resultado, indice) => {
        const nombre = nombres[indice]

        if (resultado.status === 'fulfilled') {
          nuevosDatos[nombre] = Array.isArray(resultado.value)
            ? resultado.value
            : Array.isArray(resultado.value?.data)
              ? resultado.value.data
              : []

          nuevosErrores[nombre] = false
        } else {
          nuevosDatos[nombre] = null
          nuevosErrores[nombre] = true
          console.error(
            `No se pudieron cargar los datos de ${nombre}:`,
            resultado.reason
          )
        }
      })

      setDatos(nuevosDatos)
      setErrores(nuevosErrores)
      setCargando(false)
    }

    cargarDashboard()

    return () => {
      activo = false
    }
  }, [])

  const periodo = obtenerPeriodoActual()
  const inicioClave = fechaLocalClave(periodo.inicio)
  const finClave = fechaLocalClave(periodo.fin)

  const nominasPeriodo = (datos.nominas || []).filter((nomina) => {
    const inicio = fechaClave(nomina.periodoInicio)
    const fin = fechaClave(nomina.periodoFin)

    return inicio >= inicioClave && inicio <= finClave && fin >= inicio
  })

  const totalNomina = nominasPeriodo.reduce(
    (total, nomina) => total + Number(nomina.netoPagar || 0),
    0
  )

  const novedadesPendientes = (datos.novedades || []).filter(
    (novedad) => novedad.estado === 'PENDIENTE'
  ).length

  const estadosNomina = {
    pendientes: nominasPeriodo.filter(
      (nomina) => nomina.estado === 'PENDIENTE'
    ).length,
    calculadas: nominasPeriodo.filter(
      (nomina) => nomina.estado === 'CALCULADA'
    ).length,
    aprobadas: nominasPeriodo.filter(
      (nomina) => nomina.estado === 'APROBADA'
    ).length,
    pagadas: nominasPeriodo.filter(
      (nomina) => nomina.estado === 'PAGADA'
    ).length,
  }

  const actividad = obtenerActividad(
    datos.nominas || [],
    datos.novedades || []
  )

  const periodoTexto = `${formatoFecha.format(periodo.inicio)} al ${formatoFecha.format(periodo.fin)}`

  const errorGeneral = Object.values(errores).some(Boolean)

  return (
    <div className="container-fluid bg-light min-vh-100 p-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Inicio</h2>
          <p className="text-secondary mb-0">
            Resumen general del sistema
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 42, height: 42 }}
          >
            {usuario.nombre
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((parte) => parte[0])
              .join('')
              .toUpperCase()}
          </div>

          <div>
            <strong className="d-block">{usuario.nombre}</strong>
            <small className="text-secondary">{usuario.rol}</small>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h4 className="fw-bold mb-2">
                Bienvenido al sistema
              </h4>
              <p className="text-secondary mb-1">
                Consulta los indicadores de Conta-Pro a partir de
                los registros disponibles.
              </p>
              <small className="text-secondary">
                Período actual: {periodoTexto}
              </small>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/nomina')}
            >
              <i className="bi bi-receipt me-2"></i>
              Ir a nómina
            </button>
          </div>
        </div>
      </div>

      {errorGeneral && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Algunos indicadores no están disponibles. Verifica que
          la sesión esté activa y que tu rol tenga permiso para
          consultar esos módulos. Los valores no disponibles se
          muestran como un guion.
        </div>
      )}

      <div className="row g-4 mb-4">
        <TarjetaEstadistica
          titulo="Empleados activos"
          valor={datos.empleados?.length ?? 0}
          descripcion="Empleados activos registrados"
          icono="bi-people"
          color="primary"
          cargando={cargando}
          error={errores.empleados}
        />

        <TarjetaEstadistica
          titulo="Nómina del período"
          valor={formatoMoneda.format(totalNomina)}
          descripcion="Total neto de las nóminas del período"
          icono="bi-cash-stack"
          color="success"
          cargando={cargando}
          error={errores.nominas}
        />

        <TarjetaEstadistica
          titulo="Novedades pendientes"
          valor={novedadesPendientes}
          descripcion="Requieren revisión"
          icono="bi-clipboard-check"
          color="warning"
          cargando={cargando}
          error={errores.novedades}
        />

        <TarjetaEstadistica
          titulo="Programaciones"
          valor={datos.programaciones?.length ?? 0}
          descripcion="Registros de programación"
          icono="bi-calendar-week"
          color="info"
          cargando={cargando}
          error={errores.programaciones}
        />
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
                <div>
                  <h5 className="fw-bold mb-1">
                    Actividad reciente
                  </h5>
                  <p className="text-secondary mb-0">
                    Últimos movimientos con fecha disponible
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/reportes')}
                >
                  Ver reportes
                </button>
              </div>

              {cargando ? (
                <div className="text-center py-5">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                  >
                    <span className="visually-hidden">
                      Cargando...
                    </span>
                  </div>
                  <p className="text-secondary mt-3 mb-0">
                    Consultando movimientos...
                  </p>
                </div>
              ) : actividad.length > 0 ? (
                <div className="list-group list-group-flush">
                  {actividad.map((movimiento) => (
                    <button
                      type="button"
                      key={movimiento.id}
                      className="list-group-item list-group-item-action px-0 py-3"
                      onClick={() => navigate(movimiento.ruta)}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div className="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 42, height: 42 }}
                        >
                          <i className={`bi ${movimiento.icono} fs-5`}></i>
                        </div>

                        <div className="flex-grow-1 text-start">
                          <strong className="d-block mb-1">
                            {movimiento.titulo}
                          </strong>
                          <small className="text-secondary d-block">
                            {movimiento.descripcion}
                          </small>
                          <small className="text-secondary">
                            {formatoFecha.format(
                              new Date(movimiento.fecha)
                            )}
                          </small>
                        </div>

                        <i className="bi bi-chevron-right text-secondary"></i>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-inbox fs-1 text-secondary"></i>
                  <h6 className="fw-bold mt-3">
                    No hay actividad reciente disponible
                  </h6>
                  <p className="text-secondary mb-0">
                    Los registros con fecha de creación aparecerán
                    aquí cuando estén disponibles.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1">
                Estado de nómina
              </h5>
              <p className="text-secondary mb-4">
                Período: {periodoTexto}
              </p>

              {cargando ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">
                      Cargando...
                    </span>
                  </div>
                </div>
              ) : errores.nominas ? (
                <div className="alert alert-warning mb-0">
                  No fue posible consultar los estados de nómina
                  con la sesión actual.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-hourglass-split text-secondary me-2"></i>
                      Pendientes
                    </span>
                    <span className="badge bg-secondary rounded-pill">
                      {estadosNomina.pendientes}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-calculator text-primary me-2"></i>
                      Calculadas
                    </span>
                    <span className="badge bg-primary rounded-pill">
                      {estadosNomina.calculadas}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-check-circle text-success me-2"></i>
                      Aprobadas
                    </span>
                    <span className="badge bg-success rounded-pill">
                      {estadosNomina.aprobadas}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-cash-coin text-info me-2"></i>
                      Pagadas
                    </span>
                    <span className="badge bg-info text-dark rounded-pill">
                      {estadosNomina.pagadas}
                    </span>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">
                      Total neto del período
                    </span>
                    <strong className="text-success">
                      {formatoMoneda.format(totalNomina)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-primary w-100 mt-2"
                    onClick={() => navigate('/nomina')}
                  >
                    Consultar nóminas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
