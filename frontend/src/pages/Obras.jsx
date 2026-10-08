import { useEffect, useState } from 'react'

import {
  obtenerObras,
  crearObra,
  actualizarObra,
  cambiarEstadoObra,
} from '../services/obras.service'


const API_URL = 'http://localhost:3000/api'


function obtenerHeaders() {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}


async function obtenerTurnos() {
  const respuesta = await fetch(`${API_URL}/turnos`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  let datos = null

  try {
    datos = await respuesta.json()
  } catch (error) {
    console.error('Error al leer los turnos:', error)
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.error ||
      datos?.message ||
      'No se pudieron obtener los turnos'
    )
  }

  return datos
}


function convertirFecha(fecha) {
  if (!fecha) {
    return ''
  }

  return new Date(fecha).toISOString().split('T')[0]
}


function formatearFecha(fecha) {
  if (!fecha) {
    return '-'
  }

  return new Date(fecha).toLocaleDateString('es-CO')
}


function Obras() {

  const [obras, setObras] = useState([])
  const [turnos, setTurnos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [obraEditando, setObraEditando] = useState(null)

  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    horasServicio: '',
    fechaInicio: '',
    fechaFin: '',
    turnoId: '',
  })


  useEffect(() => {
    cargarDatos()
  }, [])


  // ======================================================
  // CARGAR OBRAS Y TURNOS
  // ======================================================

  async function cargarDatos() {

    try {

      setCargando(true)
      setError('')

      const [obrasData, turnosData] = await Promise.all([
        obtenerObras(),
        obtenerTurnos(),
      ])

      setObras(obrasData)
      setTurnos(
        turnosData.filter((turno) => turno.activo)
      )

    } catch (error) {

      console.error(error)

      setError(
        error.message ||
        'No se pudieron cargar los datos.'
      )

    } finally {

      setCargando(false)

    }
  }


  // ======================================================
  // MANEJAR CAMBIOS DEL FORMULARIO
  // ======================================================

  function manejarCambio(evento) {

    const { name, value } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }


  // ======================================================
  // LIMPIAR FORMULARIO
  // ======================================================

  function limpiarFormulario() {

    setFormulario({
      nombre: '',
      descripcion: '',
      horasServicio: '',
      fechaInicio: '',
      fechaFin: '',
      turnoId: '',
    })
  }


  // ======================================================
  // ABRIR FORMULARIO NUEVO
  // ======================================================

  function abrirFormularioNuevo() {

    setMensaje('')
    setError('')
    setObraEditando(null)

    limpiarFormulario()

    setMostrarFormulario(true)
  }


  // ======================================================
  // ABRIR FORMULARIO EDITAR
  // ======================================================

  function abrirFormularioEditar(obra) {

    setMensaje('')
    setError('')
    setObraEditando(obra)

    setFormulario({
      nombre: obra.nombre || '',
      descripcion: obra.descripcion || '',
      horasServicio: obra.horasServicio || '',
      fechaInicio: convertirFecha(obra.fechaInicio),
      fechaFin: convertirFecha(obra.fechaFin),
      turnoId: obra.turno?.id || '',
    })

    setMostrarFormulario(true)
  }


  // ======================================================
  // CERRAR FORMULARIO
  // ======================================================

  function cerrarFormulario() {

    if (guardando) {
      return
    }

    setMostrarFormulario(false)
    setObraEditando(null)

    limpiarFormulario()
  }


  // ======================================================
  // GUARDAR OBRA
  // ======================================================

  async function manejarGuardar(evento) {

    evento.preventDefault()

    try {

      setGuardando(true)
      setError('')
      setMensaje('')

      if (!formulario.nombre.trim()) {
        throw new Error(
          'El nombre de la obra es obligatorio.'
        )
      }

      if (
        formulario.horasServicio === '' ||
        Number(formulario.horasServicio) <= 0
      ) {
        throw new Error(
          'Las horas de servicio deben ser mayores que cero.'
        )
      }

      if (!formulario.fechaInicio) {
        throw new Error(
          'La fecha de inicio es obligatoria.'
        )
      }

      if (!formulario.turnoId) {
        throw new Error(
          'Debes seleccionar un turno.'
        )
      }

      if (
        formulario.fechaFin &&
        formulario.fechaFin < formulario.fechaInicio
      ) {
        throw new Error(
          'La fecha de fin no puede ser anterior a la fecha de inicio.'
        )
      }

      const datosObra = {
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim() || null,
        horasServicio: Number(formulario.horasServicio),
        fechaInicio: formulario.fechaInicio,
        fechaFin: formulario.fechaFin || null,
        turnoId: formulario.turnoId,
      }


      // ==================================================
      // EDITAR
      // ==================================================

      if (obraEditando) {

        const obraActualizada =
          await actualizarObra(
            obraEditando.id,
            datosObra
          )

        setObras((anteriores) =>
          anteriores.map((obra) =>
            obra.id === obraEditando.id
              ? obraActualizada
              : obra
          )
        )

        setMensaje(
          'Obra actualizada correctamente.'
        )

      }


      // ==================================================
      // CREAR
      // ==================================================

      else {

        const nuevaObra =
          await crearObra(datosObra)

        setObras((anteriores) => [
          ...anteriores,
          nuevaObra,
        ])

        setMensaje(
          'Obra creada correctamente.'
        )
      }


      setMostrarFormulario(false)
      setObraEditando(null)

      limpiarFormulario()

    } catch (error) {

      console.error(error)

      setError(
        error.message ||
        'No se pudo guardar la obra.'
      )

    } finally {

      setGuardando(false)

    }
  }


  // ======================================================
  // CAMBIAR ESTADO
  // ======================================================

  async function manejarCambioEstado(obra) {

    const nuevoEstado = !obra.activo

    const mensajeConfirmacion =
      nuevoEstado
        ? '¿Deseas activar esta obra?'
        : '¿Deseas desactivar esta obra?'

    const confirmar = window.confirm(
      mensajeConfirmacion
    )

    if (!confirmar) {
      return
    }

    try {

      setError('')
      setMensaje('')

      await cambiarEstadoObra(
        obra.id,
        nuevoEstado
      )

      if (nuevoEstado) {

        setObras((anteriores) =>
          anteriores.map((item) =>
            item.id === obra.id
              ? {
                  ...item,
                  activo: true,
                }
              : item
          )
        )

        setMensaje(
          'Obra activada correctamente.'
        )

      } else {

        setObras((anteriores) =>
          anteriores.filter(
            (item) => item.id !== obra.id
          )
        )

        setMensaje(
          'Obra desactivada correctamente.'
        )
      }

    } catch (error) {

      console.error(error)

      setError(
        error.message ||
        'No se pudo cambiar el estado de la obra.'
      )
    }
  }


  return (
    <div className="page">

      {/* =========================
          ENCABEZADO
      ========================== */}

      <div className="page-header">

        <div>

          <h2>
            Obras / Servicios
          </h2>

          <p>
            Consulta y administra las obras o servicios registrados.
          </p>

        </div>


        <button
          type="button"
          className="primary-button"
          onClick={abrirFormularioNuevo}
        >
          + Nueva obra
        </button>

      </div>


      {/* =========================
          MENSAJES
      ========================== */}

      {mensaje && (

        <div className="panel success-panel">

          <p>
            {mensaje}
          </p>

        </div>

      )}


      {error && (

        <div className="panel error-panel">

          <p>
            {error}
          </p>

        </div>

      )}


      {/* =========================
          CARGANDO
      ========================== */}

      {cargando && (

        <div className="panel">

          <p>
            Cargando obras...
          </p>

        </div>

      )}


      {/* =========================
          TABLA
      ========================== */}

      {!cargando && (

        <div className="panel">

          <div className="panel-header">

            <div>

              <h3>
                Obras registradas
              </h3>

              <p>
                {obras.length} obra(s)
              </p>

            </div>

          </div>


          {obras.length === 0 ? (

            <div className="empty-state">

              <h4>
                No hay obras registradas
              </h4>

              <p>
                Cuando registres una obra aparecerá aquí.
              </p>

            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      Obra
                    </th>

                    <th>
                      Horas
                    </th>

                    <th>
                      Fecha inicio
                    </th>

                    <th>
                      Fecha fin
                    </th>

                    <th>
                      Turno
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Acciones
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {obras.map((obra) => (

                    <tr key={obra.id}>

                      <td>

                        <strong>
                          {obra.nombre}
                        </strong>

                        {obra.descripcion && (

                          <div>
                            {obra.descripcion}
                          </div>

                        )}

                      </td>


                      <td>
                        {Number(
                          obra.horasServicio || 0
                        )} h
                      </td>


                      <td>
                        {formatearFecha(
                          obra.fechaInicio
                        )}
                      </td>


                      <td>
                        {formatearFecha(
                          obra.fechaFin
                        )}
                      </td>


                      <td>
                        {obra.turno?.nombre ||
                          'Sin turno'}
                      </td>


                      <td>

                        <span
                          className={
                            obra.activo
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {obra.activo
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>

                      </td>


                      <td>

                        <div className="actions-container">

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              abrirFormularioEditar(
                                obra
                              )
                            }
                          >
                            Editar
                          </button>


                          <button
                            type="button"
                            className={
                              obra.activo
                                ? 'danger-button'
                                : 'success-button'
                            }
                            onClick={() =>
                              manejarCambioEstado(
                                obra
                              )
                            }
                          >
                            {obra.activo
                              ? 'Desactivar'
                              : 'Activar'}
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </div>

      )}


      {/* =========================
          MODAL NUEVA / EDITAR
      ========================== */}

      {mostrarFormulario && (

        <div className="modal-overlay">

          <div className="employee-modal">

            <div className="modal-header">

              <div>

                <h3>

                  {obraEditando
                    ? 'Editar obra'
                    : 'Nueva obra'}

                </h3>

                <p>

                  {obraEditando
                    ? 'Modifica la información de la obra.'
                    : 'Registra la información básica de la obra.'}

                </p>

              </div>


              <button
                type="button"
                className="modal-close"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                ×
              </button>

            </div>


            <form onSubmit={manejarGuardar}>

              <div className="form-grid">


                {/* NOMBRE */}

                <div className="form-group">

                  <label>
                    Nombre de la obra
                  </label>

                  <input
                    type="text"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    placeholder="Nombre de la obra o servicio"
                    required
                  />

                </div>


                {/* HORAS */}

                <div className="form-group">

                  <label>
                    Horas de servicio
                  </label>

                  <input
                    type="number"
                    name="horasServicio"
                    value={formulario.horasServicio}
                    onChange={manejarCambio}
                    placeholder="Ej. 12"
                    min="0.01"
                    step="0.01"
                    required
                  />

                </div>


                {/* FECHA INICIO */}

                <div className="form-group">

                  <label>
                    Fecha de inicio
                  </label>

                  <input
                    type="date"
                    name="fechaInicio"
                    value={formulario.fechaInicio}
                    onChange={manejarCambio}
                    required
                  />

                </div>


                {/* FECHA FIN */}

                <div className="form-group">

                  <label>
                    Fecha de fin
                  </label>

                  <input
                    type="date"
                    name="fechaFin"
                    value={formulario.fechaFin}
                    onChange={manejarCambio}
                  />

                  <small>
                    Opcional. Déjalo vacío si la obra no tiene fecha de finalización definida.
                  </small>

                </div>


                {/* TURNO */}

                <div className="form-group">

                  <label>
                    Turno
                  </label>

                  <select
                    name="turnoId"
                    value={formulario.turnoId}
                    onChange={manejarCambio}
                    required
                  >

                    <option value="">
                      Selecciona un turno
                    </option>

                    {turnos.map((turno) => (

                      <option
                        key={turno.id}
                        value={turno.id}
                      >
                        {turno.nombre}
                      </option>

                    ))}

                  </select>

                </div>


                {/* DESCRIPCIÓN */}

                <div className="form-group">

                  <label>
                    Descripción
                  </label>

                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={manejarCambio}
                    placeholder="Descripción de la obra o servicio"
                    rows="3"
                  />

                </div>

              </div>


              {/* =========================
                  BOTONES
              ========================== */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando...'
                    : obraEditando
                      ? 'Actualizar obra'
                      : 'Crear obra'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  )
}


export default Obras
