import { Component, useEffect, useMemo, useState } from 'react'

// Componente independiente: no modifica ningún servicio ni página existente.
const API = 'http://localhost:3000/api'

function tokenGuardado() {
  return localStorage.getItem('token') || localStorage.getItem('accessToken') || ''
}

async function llamarApi(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenGuardado()
  if (token) headers.Authorization = `Bearer ${token}`

  const respuesta = await fetch(`${API}${ruta}`, { ...opciones, headers })
  const datos = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    throw new Error(datos.error || datos.message || 'Error en la solicitud')
  }
  return datos
}

function rangoDe(mes, tipo) {
  const [anio, m] = mes.split('-').map(Number)
  const pad = (n) => String(n).padStart(2, '0')
  const ultimo = new Date(Date.UTC(anio, m, 0)).getUTCDate()

  if (tipo === 'Q1') return { desde: `${anio}-${pad(m)}-01`, hasta: `${anio}-${pad(m)}-15` }
  if (tipo === 'Q2') return { desde: `${anio}-${pad(m)}-16`, hasta: `${anio}-${pad(m)}-${pad(ultimo)}` }
  return { desde: `${anio}-${pad(m)}-01`, hasta: `${anio}-${pad(m)}-${pad(ultimo)}` }
}

function nombreEmpleado(e) {
  if (!e) return 'Sin empleado'
  const completo = [e.apellidos, e.nombres].filter(Boolean).join(' ').trim()
  return completo || e.nombreCompleto || e.nombre || 'Sin nombre'
}

function GeneradorMasivoInterno({ empleados = [], turnos = [], onGuardado }) {
  const [mes, setMes] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState('')

  const [turnoBase, setTurnoBase] = useState('')
  const [diasTrabajo, setDiasTrabajo] = useState(4)
  const [diasDescanso, setDiasDescanso] = useState(2)
  const [ciclo, setCiclo] = useState([]) // valores: 'DESC' o id de turno

  const [escalonar, setEscalonar] = useState(false)
  const [reemplazar, setReemplazar] = useState(false)

  const [seleccion, setSeleccion] = useState(new Set())
  const [texto, setTexto] = useState('')

  const [vista, setVista] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    llamarApi('/obras')
      .then((datos) => setObras(Array.isArray(datos) ? datos : datos?.data || []))
      .catch(() => setObras([]))
  }, [])

  // Si cambia cualquier dato, la vista previa anterior deja de ser válida.
  useEffect(() => {
    setVista(null)
  }, [desde, hasta, obraId, ciclo, escalonar, reemplazar, seleccion])

  const turnosActivos = useMemo(
    () =>
      turnos.filter(
        (t) => t.activo !== false && String(t.nombre).trim().toLowerCase() !== 'descanso'
      ),
    [turnos]
  )

  const turnoPorId = useMemo(() => new Map(turnos.map((t) => [t.id, t])), [turnos])
  const empleadoPorId = useMemo(() => new Map(empleados.map((e) => [e.id, e])), [empleados])

  const empleadosVisibles = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return empleados
      .filter((e) => e.activo !== false)
      .filter((e) => {
        if (!t) return true
        return (
          nombreEmpleado(e).toLowerCase().includes(t) ||
          String(e.documento || '').toLowerCase().includes(t)
        )
      })
  }, [empleados, texto])

  function elegirRango(tipo) {
    if (!mes) {
      setError('Primero seleccione el mes')
      return
    }
    setError('')
    const r = rangoDe(mes, tipo)
    setDesde(r.desde)
    setHasta(r.hasta)
  }

  function armarCiclo() {
    setError('')
    const dt = Number(diasTrabajo)
    const dd = Number(diasDescanso)
    if (!turnoBase) return setError('Seleccione el turno para armar el ciclo')
    if (!Number.isInteger(dt) || dt < 1 || !Number.isInteger(dd) || dd < 0) {
      return setError('Los días de trabajo deben ser mayores que 0 y los de descanso no pueden ser negativos')
    }
    setCiclo([...Array(dt).fill(turnoBase), ...Array(dd).fill('DESC')])
  }

  function cambiarPosicion(indice, valor) {
    setCiclo((actual) => actual.map((v, i) => (i === indice ? valor : v)))
  }

  function quitarPosicion(indice) {
    setCiclo((actual) => actual.filter((_, i) => i !== indice))
  }

  function agregarPosicion() {
    setCiclo((actual) => [...actual, 'DESC'])
  }

  function alternar(id) {
    setSeleccion((actual) => {
      const nuevo = new Set(actual)
      nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id)
      return nuevo
    })
  }

  function seleccionarVisibles() {
    setSeleccion((actual) => {
      const nuevo = new Set(actual)
      empleadosVisibles.forEach((e) => nuevo.add(e.id))
      return nuevo
    })
  }

  function limpiarSeleccion() {
    setSeleccion(new Set())
  }

  function validar() {
    if (!desde || !hasta) throw new Error('Defina el período (desde y hasta)')
    if (hasta < desde) throw new Error('La fecha final no puede ser menor que la inicial')
    if (ciclo.length === 0) throw new Error('Arme el ciclo de turnos')
    if (!ciclo.some((v) => v !== 'DESC')) throw new Error('El ciclo debe tener al menos un día de trabajo')
    if (seleccion.size === 0) throw new Error('Seleccione al menos un empleado')
  }

  async function enviar(vistaPrevia) {
    try {
      setError('')
      setMensaje('')
      validar()
      setCargando(true)

      const cuerpo = {
        desde,
        hasta,
        ...(obraId ? { obraId } : {}),
        ciclo,
        escalonar,
        reemplazar,
        vistaPrevia,
        asignaciones: [...seleccion].map((empleadoId) => ({ empleadoId })),
      }

      const respuesta = await llamarApi('/programaciones/generar-masivo', {
        method: 'POST',
        body: JSON.stringify(cuerpo),
      })

      if (vistaPrevia) {
        setVista(respuesta)
        setResultado(null)
      } else {
        setResultado(respuesta)
        setVista(null)
        setMensaje(`Se crearon ${respuesta.totales.creadas} programaciones correctamente.`)
        if (onGuardado) await onGuardado()
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación')
    } finally {
      setCargando(false)
    }
  }

  const etiquetaTurno = (t) =>
    `${t.nombre}${t.horasProgramadas != null ? ` (${Number(t.horasProgramadas)} h)` : ''}`

  const info = vista || resultado

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      {/* 1. PERÍODO */}
      <h6 className="mb-2">1. Período</h6>
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <label className="form-label">Mes</label>
          <input type="month" className="form-control" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
        <div className="col-md-5 d-flex align-items-end gap-2 flex-wrap">
          <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => elegirRango('Q1')}>
            1ª quincena (1–15)
          </button>
          <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => elegirRango('Q2')}>
            2ª quincena (16–fin)
          </button>
          <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => elegirRango('MES')}>
            Mes completo
          </button>
        </div>
        <div className="col-md-2">
          <label className="form-label">Desde</label>
          <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Hasta</label>
          <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Obra / puesto (opcional)</label>
          <select className="form-select" value={obraId} onChange={(e) => setObraId(e.target.value)}>
            <option value="">Sin obra</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. CICLO */}
      <h6 className="mb-2">2. Ciclo de turnos</h6>
      <div className="row g-3 mb-2">
        <div className="col-md-4">
          <label className="form-label">Turno base</label>
          <select className="form-select" value={turnoBase} onChange={(e) => setTurnoBase(e.target.value)}>
            <option value="">Seleccionar turno</option>
            {turnosActivos.map((t) => (
              <option key={t.id} value={t.id}>
                {etiquetaTurno(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Días trabajo</label>
          <input type="number" min="1" className="form-control" value={diasTrabajo} onChange={(e) => setDiasTrabajo(e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Días descanso</label>
          <input type="number" min="0" className="form-control" value={diasDescanso} onChange={(e) => setDiasDescanso(e.target.value)} />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <button type="button" className="btn btn-outline-dark" onClick={armarCiclo}>
            Armar ciclo ({diasTrabajo}x{diasDescanso})
          </button>
        </div>
      </div>

      {ciclo.length > 0 && (
        <div className="mb-4">
          <small className="text-muted d-block mb-2">
            Puedes cambiar cualquier posición (por ejemplo, alternar día y noche) o agregar y quitar días.
          </small>
          <div className="d-flex flex-wrap gap-2 align-items-start">
            {ciclo.map((valor, i) => (
              <div key={i} className="border rounded p-2" style={{ minWidth: 150 }}>
                <div className="small text-muted mb-1 d-flex justify-content-between">
                  <span>Día {i + 1}</span>
                  <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => quitarPosicion(i)}>
                    quitar
                  </button>
                </div>
                <select className="form-select form-select-sm" value={valor} onChange={(e) => cambiarPosicion(i, e.target.value)}>
                  <option value="DESC">DESCANSO</option>
                  {turnosActivos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {etiquetaTurno(t)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button type="button" className="btn btn-outline-secondary btn-sm align-self-center" onClick={agregarPosicion}>
              + día
            </button>
          </div>
        </div>
      )}

      <div className="form-check mb-1">
        <input id="gm-escalonar" type="checkbox" className="form-check-input" checked={escalonar} onChange={(e) => setEscalonar(e.target.checked)} />
        <label htmlFor="gm-escalonar" className="form-check-label">
          Escalonar descansos (cada empleado empieza en una posición distinta del ciclo)
        </label>
      </div>
      <div className="form-check mb-4">
        <input id="gm-reemplazar" type="checkbox" className="form-check-input" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
        <label htmlFor="gm-reemplazar" className="form-check-label">
          Reemplazar programaciones en estado PROGRAMADO dentro del período (las cumplidas o con cambios no se tocan)
        </label>
      </div>

      {/* 3. EMPLEADOS */}
      <h6 className="mb-2">3. Empleados ({seleccion.size} seleccionados)</h6>
      <div className="d-flex gap-2 flex-wrap mb-2">
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Buscar por nombre o documento"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="button" className="btn btn-outline-dark btn-sm" onClick={seleccionarVisibles}>
          Seleccionar los {empleadosVisibles.length} visibles
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarSeleccion}>
          Limpiar selección
        </button>
      </div>

      <div className="border rounded mb-4" style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table className="table table-sm table-hover mb-0">
          <tbody>
            {empleadosVisibles.length === 0 ? (
              <tr>
                <td className="text-center text-muted py-3">No hay empleados para mostrar.</td>
              </tr>
            ) : (
              empleadosVisibles.map((e) => (
                <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => alternar(e.id)}>
                  <td style={{ width: 40 }}>
                    <input type="checkbox" className="form-check-input" checked={seleccion.has(e.id)} onChange={() => alternar(e.id)} />
                  </td>
                  <td>{nombreEmpleado(e)}</td>
                  <td className="text-muted">{e.documento}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ACCIONES */}
      <div className="d-flex gap-2 mb-4">
        <button type="button" className="btn btn-dark" disabled={cargando} onClick={() => enviar(true)}>
          {cargando ? 'Procesando...' : 'Ver vista previa'}
        </button>
        <button
          type="button"
          className="btn btn-success"
          disabled={cargando || !vista || vista.totales.filas === 0}
          onClick={() => enviar(false)}
        >
          Confirmar y guardar
        </button>
      </div>

      {/* RESULTADO / VISTA PREVIA */}
      {info && (
        <div className="border rounded p-3">
          <h6 className="mb-3">{vista ? 'Vista previa (aún no se ha guardado nada)' : 'Resultado'}</h6>

          <div className="row text-center g-2 mb-3">
            {[
              ['Empleados', info.totales.empleados],
              [vista ? 'Filas a crear' : 'Creadas', vista ? info.totales.filas : info.totales.creadas],
              ['Omitidas (ya existían)', info.totales.omitidas],
              ['A reemplazar', info.totales.aReemplazar],
              ['Con novedad aprobada', info.totales.conNovedadAprobada],
              ['Errores', info.totales.errores],
            ].map(([titulo, valor]) => (
              <div className="col-6 col-md-2" key={titulo}>
                <div className="border rounded py-2">
                  <div className="fs-5 fw-bold">{valor}</div>
                  <div className="small text-muted">{titulo}</div>
                </div>
              </div>
            ))}
          </div>

          {info.totales.conNovedadAprobada > 0 && (
            <div className="alert alert-warning py-2">
              Hay días de trabajo programados sobre incapacidades, ausencias o permisos aprobados. Revise la columna
              “Novedad” antes de confirmar.
            </div>
          )}

          {info.errores.length > 0 && (
            <div className="alert alert-danger py-2">
              <strong>Empleados que no se procesaron:</strong>
              <ul className="mb-0">
                {info.errores.map((er, i) => (
                  <li key={i}>
                    {nombreEmpleado(empleadoPorId.get(er.empleadoId)) || er.empleadoId}: {er.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-sm table-bordered align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Empleado</th>
                  <th>Documento</th>
                  <th className="text-end">Días trabajo</th>
                  <th className="text-end">Descansos</th>
                  <th className="text-end">Horas</th>
                  <th className="text-end">Omitidas</th>
                  <th className="text-end">Novedad</th>
                </tr>
              </thead>
              <tbody>
                {info.resumen.map((r) => (
                  <tr key={r.empleadoId}>
                    <td>{r.empleado}</td>
                    <td>{r.documento}</td>
                    <td className="text-end">{r.diasTrabajo}</td>
                    <td className="text-end">{r.diasDescanso}</td>
                    <td className="text-end">{r.horas}</td>
                    <td className="text-end">{r.omitidas}</td>
                    <td className="text-end">{r.conNovedad > 0 ? <span className="badge bg-warning text-dark">{r.conNovedad}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Si algo falla al dibujar la pantalla, se muestra el error aquí
// en lugar de dejar toda la aplicación en blanco.
class LimiteDeError extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error en GeneradorMasivo:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="alert alert-danger">
          <strong>Error en la generación masiva:</strong>{' '}
          {String(this.state.error?.message || this.state.error)}
          <div>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark mt-2"
              onClick={() => this.setState({ error: null })}
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function GeneradorMasivo(props) {
  return (
    <LimiteDeError>
      <GeneradorMasivoInterno {...props} />
    </LimiteDeError>
  )
}