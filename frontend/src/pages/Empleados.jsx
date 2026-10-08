import { useEffect, useState } from 'react'

import {
  obtenerEmpleados,
  crearEmpleado,
  actualizarEmpleado,
  cambiarEstadoEmpleado,
} from '../services/empleados.service'

import { obtenerCargos } from '../services/cargos.service'
import { obtenerUsuarioActual } from '../services/auth.service'

function Empleados() {
  const [empleados, setEmpleados] = useState([])
  const [cargos, setCargos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [retirando, setRetirando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarRetiro, setMostrarRetiro] = useState(false)

  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [empleadoRetirando, setEmpleadoRetirando] = useState(null)

  const [formulario, setFormulario] = useState({
    nombres: '',
    apellidos: '',
    documento: '',
    cargoId: '',
    salarioBase: '',
    fechaIngreso: '',
  })

  const [formularioRetiro, setFormularioRetiro] = useState({
    fechaSalida: '',
    motivoSalida: '',
    observacionSalida: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError('')

      const [empleadosData, cargosData] = await Promise.all([
        obtenerEmpleados(),
        obtenerCargos(),
      ])

      setEmpleados(empleadosData)
      setCargos(cargosData)
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

  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  function manejarCambioDocumento(evento) {
    let valor = evento.target.value

    valor = valor.replace(/\D/g, '')
    valor = valor.substring(0, 10)

    setFormulario((anterior) => ({
      ...anterior,
      documento: valor,
    }))
  }

  function manejarCambioFechaIngreso(evento) {
    let valor = evento.target.value

    valor = valor.replace(/\D/g, '')
    valor = valor.substring(0, 8)

    if (valor.length > 4) {
      valor =
        valor.substring(0, 2) +
        '/' +
        valor.substring(2, 4) +
        '/' +
        valor.substring(4)
    } else if (valor.length > 2) {
      valor =
        valor.substring(0, 2) +
        '/' +
        valor.substring(2)
    }

    setFormulario((anterior) => ({
      ...anterior,
      fechaIngreso: valor,
    }))
  }

  function manejarCambioFechaSalida(evento) {
    let valor = evento.target.value

    valor = valor.replace(/\D/g, '')
    valor = valor.substring(0, 8)

    if (valor.length > 4) {
      valor =
        valor.substring(0, 2) +
        '/' +
        valor.substring(2, 4) +
        '/' +
        valor.substring(4)
    } else if (valor.length > 2) {
      valor =
        valor.substring(0, 2) +
        '/' +
        valor.substring(2)
    }

    setFormularioRetiro((anterior) => ({
      ...anterior,
      fechaSalida: valor,
    }))
  }

  function manejarCambioRetiro(evento) {
    const { name, value } = evento.target

    setFormularioRetiro((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  function limpiarFormulario() {
    setFormulario({
      nombres: '',
      apellidos: '',
      documento: '',
      cargoId: '',
      salarioBase: '',
      fechaIngreso: '',
    })
  }

  function limpiarFormularioRetiro() {
    setFormularioRetiro({
      fechaSalida: '',
      motivoSalida: '',
      observacionSalida: '',
    })
  }

  function abrirFormularioNuevo() {
    setMensaje('')
    setError('')
    setEmpleadoEditando(null)
    limpiarFormulario()
    setMostrarFormulario(true)
  }

  function abrirFormularioEditar(empleado) {
    setMensaje('')
    setError('')
    setEmpleadoEditando(empleado)

    let fechaFormateada = ''

    if (empleado.fechaIngreso) {
      const fecha = String(
        empleado.fechaIngreso
      ).substring(0, 10)

      const partes = fecha.split('-')

      if (partes.length === 3) {
        fechaFormateada =
          `${partes[2]}/${partes[1]}/${partes[0]}`
      }
    }

    setFormulario({
      nombres: empleado.nombres || '',
      apellidos: empleado.apellidos || '',
      documento: empleado.documento || '',
      cargoId:
        empleado.cargoId ||
        empleado.cargoCatalogo?.id ||
        '',
      salarioBase: empleado.salarioBase
        ? Number(empleado.salarioBase)
        : '',
      fechaIngreso: fechaFormateada,
    })

    setMostrarFormulario(true)
  }

  function cerrarFormulario() {
    if (!guardando) {
      setMostrarFormulario(false)
      setEmpleadoEditando(null)
      limpiarFormulario()
    }
  }

  function abrirFormularioRetiro(empleado) {
    setMensaje('')
    setError('')

    setEmpleadoRetirando(empleado)
    limpiarFormularioRetiro()
    setMostrarRetiro(true)
  }

  function cerrarFormularioRetiro() {
    if (!retirando) {
      setMostrarRetiro(false)
      setEmpleadoRetirando(null)
      limpiarFormularioRetiro()
    }
  }

  function convertirFechaDDMMAAAA(fechaTexto) {
    const formatoFecha =
      /^\d{2}\/\d{2}\/\d{4}$/

    if (!formatoFecha.test(fechaTexto)) {
      throw new Error(
        'La fecha debe tener el formato DD/MM/AAAA.'
      )
    }

    const partesFecha = fechaTexto.split('/')

    const dia = Number(partesFecha[0])
    const mes = Number(partesFecha[1])
    const año = Number(partesFecha[2])

    const fecha = new Date(
      año,
      mes - 1,
      dia
    )

    if (
      fecha.getFullYear() !== año ||
      fecha.getMonth() !== mes - 1 ||
      fecha.getDate() !== dia
    ) {
      throw new Error(
        'La fecha indicada no es válida.'
      )
    }

    return {
      dia,
      mes,
      año,
      fechaBackend:
        `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    }
  }

  async function manejarRetiro(evento) {
    evento.preventDefault()

    if (!empleadoRetirando) {
      return
    }

    try {
      setRetirando(true)
      setError('')
      setMensaje('')

      if (!formularioRetiro.fechaSalida) {
        throw new Error(
          'La fecha de salida es obligatoria.'
        )
      }

      if (
        !formularioRetiro.motivoSalida.trim()
      ) {
        throw new Error(
          'El motivo de salida es obligatorio.'
        )
      }

      const datosFecha =
        convertirFechaDDMMAAAA(
          formularioRetiro.fechaSalida
        )

      const fechaIngreso =
        String(
          empleadoRetirando.fechaIngreso
        ).substring(0, 10)

      const partesIngreso =
        fechaIngreso.split('-')

      const fechaIngresoObjeto =
        new Date(
          Number(partesIngreso[0]),
          Number(partesIngreso[1]) - 1,
          Number(partesIngreso[2])
        )

      const fechaSalidaObjeto =
        new Date(
          datosFecha.año,
          datosFecha.mes - 1,
          datosFecha.dia
        )

      if (
        fechaSalidaObjeto < fechaIngresoObjeto
      ) {
        throw new Error(
          'La fecha de salida no puede ser anterior a la fecha de ingreso.'
        )
      }

      const datosRetiro = {
        fechaSalida: datosFecha.fechaBackend,
        motivoSalida:
          formularioRetiro.motivoSalida.trim(),
        observacionSalida:
          formularioRetiro.observacionSalida.trim() ||
          null,
      }

      await cambiarEstadoEmpleado(
        empleadoRetirando.id,
        datosRetiro
      )

      setEmpleados((anteriores) =>
        anteriores.filter(
          (empleado) =>
            empleado.id !== empleadoRetirando.id
        )
      )

      setMensaje(
        `Empleado ${empleadoRetirando.nombres} ${empleadoRetirando.apellidos} retirado correctamente.`
      )

      setMostrarRetiro(false)
      setEmpleadoRetirando(null)
      limpiarFormularioRetiro()
    } catch (error) {
      console.error(error)

      setError(
        error.message ||
          'No se pudo retirar el empleado.'
      )
    } finally {
      setRetirando(false)
    }
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      // ============================
      // VALIDAR FECHA DE INGRESO
      // ============================

      const fechaIngresada =
        formulario.fechaIngreso

      if (!fechaIngresada) {
        throw new Error(
          'La fecha de ingreso es obligatoria.'
        )
      }

      const datosFecha =
        convertirFechaDDMMAAAA(
          fechaIngresada
        )

      // ============================
      // USUARIO ACTUAL
      // ============================

      const usuario =
        obtenerUsuarioActual()

      if (!usuario) {
        throw new Error(
          'La sesión no está disponible. Inicia sesión nuevamente.'
        )
      }

      // ============================
      // DATOS DEL EMPLEADO
      // ============================

      const datosEmpleado = {
        nombres:
          formulario.nombres.trim(),

        apellidos:
          formulario.apellidos.trim(),

        documento:
          formulario.documento.trim(),

        cargoId:
          formulario.cargoId,

        salarioBase:
          Number(formulario.salarioBase),

        fechaIngreso:
          datosFecha.fechaBackend,

        empresaId:
          usuario.empresaId,
      }

      if (!datosEmpleado.empresaId) {
        throw new Error(
          'El usuario no tiene una empresa asociada.'
        )
      }

      // ============================
      // EDITAR EMPLEADO
      // ============================

      if (empleadoEditando) {
        const empleadoActualizado =
          await actualizarEmpleado(
            empleadoEditando.id,
            datosEmpleado
          )

        setEmpleados((anteriores) =>
          anteriores.map((empleado) =>
            empleado.id ===
            empleadoEditando.id
              ? empleadoActualizado
              : empleado
          )
        )

        setMensaje(
          'Empleado actualizado correctamente.'
        )
      }

      // ============================
      // CREAR EMPLEADO
      // ============================

      else {
        const nuevoEmpleado =
          await crearEmpleado(
            datosEmpleado
          )

        setEmpleados((anteriores) => [
          ...anteriores,
          nuevoEmpleado,
        ])

        setMensaje(
          'Empleado creado correctamente.'
        )
      }

      setMostrarFormulario(false)
      setEmpleadoEditando(null)
      limpiarFormulario()
    } catch (error) {
      console.error(error)

      setError(
        error.message ||
          'No se pudo guardar el empleado.'
      )
    } finally {
      setGuardando(false)
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
            Empleados
          </h2>

          <p>
            Consulta y administra los empleados registrados.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={abrirFormularioNuevo}
        >
          <i className="bi bi-plus-lg"></i>

          <span>
            Nuevo empleado
          </span>
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
            Cargando empleados...
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
                Empleados registrados
              </h3>

              <p>
                {empleados.length} empleado(s)
              </p>
            </div>
          </div>

          {empleados.length === 0 ? (
            <div className="empty-state">
              <h4>
                No hay empleados registrados
              </h4>

              <p>
                Cuando registres empleados aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>
                      Documento
                    </th>

                    <th>
                      Nombre
                    </th>

                    <th>
                      Cargo
                    </th>

                    <th>
                      Salario base
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
                  {empleados.map((empleado) => (
                    <tr key={empleado.id}>

                      <td>
                        {empleado.documento}
                      </td>

                      <td>
                        {empleado.nombres}{' '}
                        {empleado.apellidos}
                      </td>

                      <td>
                        {empleado.cargoCatalogo?.nombre ||
                          'Sin cargo'}
                      </td>

                      <td>
                        $
                        {Number(
                          empleado.salarioBase || 0
                        ).toLocaleString('es-CO')}
                      </td>

                      <td>
                        <span
                          className={
                            empleado.activo
                              ? 'status active'
                              : 'status inactive'
                          }
                        >
                          {empleado.activo
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="actions-container">

                          {/* EDITAR */}

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              abrirFormularioEditar(
                                empleado
                              )
                            }
                            title="Editar empleado"
                          >
                            <i className="bi bi-pencil"></i>

                            <span>
                              Editar
                            </span>
                          </button>

                          {/* RETIRAR */}

                          {empleado.activo && (
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() =>
                                abrirFormularioRetiro(
                                  empleado
                                )
                              }
                              title="Retirar empleado"
                            >
                              <i className="bi bi-person-dash"></i>

                              <span>
                                Retirar
                              </span>
                            </button>
                          )}

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
          MODAL NUEVO / EDITAR
      ========================== */}

      {mostrarFormulario && (
        <div className="modal-overlay">

          <div className="employee-modal">

            <div className="modal-header">

              <div>
                <h3>
                  {empleadoEditando
                    ? 'Editar empleado'
                    : 'Nuevo empleado'}
                </h3>

                <p>
                  {empleadoEditando
                    ? 'Modifica la información del empleado.'
                    : 'Registra la información básica del empleado.'}
                </p>
              </div>

              {/* CERRAR */}

              <button
                type="button"
                className="modal-close"
                onClick={cerrarFormulario}
                disabled={guardando}
                title="Cerrar"
              >
                <i className="bi bi-x-lg"></i>
              </button>

            </div>

            <form onSubmit={manejarGuardar}>

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Nombres
                  </label>

                  <input
                    type="text"
                    name="nombres"
                    value={formulario.nombres}
                    onChange={manejarCambio}
                    placeholder="Nombres"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Apellidos
                  </label>

                  <input
                    type="text"
                    name="apellidos"
                    value={formulario.apellidos}
                    onChange={manejarCambio}
                    placeholder="Apellidos"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Documento
                  </label>

                  <input
                    type="text"
                    name="documento"
                    value={formulario.documento}
                    onChange={manejarCambioDocumento}
                    placeholder="Número de documento"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]{1,10}"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Cargo
                  </label>

                  <select
                    name="cargoId"
                    value={formulario.cargoId}
                    onChange={manejarCambio}
                    required
                  >
                    <option value="">
                      Selecciona un cargo
                    </option>

                    {cargos.map((cargo) => (
                      <option
                        key={cargo.id}
                        value={cargo.id}
                      >
                        {cargo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Salario base
                  </label>

                  <input
                    type="number"
                    name="salarioBase"
                    value={formulario.salarioBase}
                    onChange={manejarCambio}
                    placeholder="1750905"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Fecha de ingreso
                  </label>

                  <input
                    type="text"
                    name="fechaIngreso"
                    value={formulario.fechaIngreso}
                    onChange={manejarCambioFechaIngreso}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    inputMode="numeric"
                    required
                  />
                </div>

              </div>

              {/* =========================
                  BOTONES
              ========================== */}

              <div className="modal-actions">

                {/* CANCELAR */}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  <i className="bi bi-x-lg"></i>

                  <span>
                    Cancelar
                  </span>
                </button>

                {/* GUARDAR */}

                <button
                  type="submit"
                  className="primary-button"
                  disabled={guardando}
                >
                  <i
                    className={
                      guardando
                        ? 'bi bi-hourglass-split'
                        : 'bi bi-check-lg'
                    }
                  ></i>

                  <span>
                    {guardando
                      ? 'Guardando...'
                      : empleadoEditando
                        ? 'Guardar cambios'
                        : 'Guardar empleado'}
                  </span>
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================
          MODAL RETIRAR EMPLEADO
      ========================== */}

      {mostrarRetiro && empleadoRetirando && (
        <div className="modal-overlay">

          <div className="employee-modal">

            <div className="modal-header">

              <div>
                <h3>
                  Retirar empleado
                </h3>

                <p>
                  Registra la información de retiro del empleado.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={cerrarFormularioRetiro}
                disabled={retirando}
                title="Cerrar"
              >
                <i className="bi bi-x-lg"></i>
              </button>

            </div>

            <div className="panel">
              <p>
                <strong>
                  Empleado:
                </strong>{' '}
                {empleadoRetirando.nombres}{' '}
                {empleadoRetirando.apellidos}
              </p>

              <p>
                <strong>
                  Documento:
                </strong>{' '}
                {empleadoRetirando.documento}
              </p>

              <p>
                <strong>
                  Fecha de ingreso:
                </strong>{' '}
                {empleadoRetirando.fechaIngreso
                  ? String(
                      empleadoRetirando.fechaIngreso
                    ).substring(0, 10)
                  : ''}
              </p>
            </div>

            <form onSubmit={manejarRetiro}>

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Fecha de salida
                  </label>

                  <input
                    type="text"
                    name="fechaSalida"
                    value={
                      formularioRetiro.fechaSalida
                    }
                    onChange={
                      manejarCambioFechaSalida
                    }
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Motivo de salida
                  </label>

                  <select
                    name="motivoSalida"
                    value={
                      formularioRetiro.motivoSalida
                    }
                    onChange={
                      manejarCambioRetiro
                    }
                    required
                  >
                    <option value="">
                      Selecciona un motivo
                    </option>

                    <option value="Renuncia voluntaria">
                      Renuncia voluntaria
                    </option>

                    <option value="Terminación de contrato">
                      Terminación de contrato
                    </option>

                    <option value="Despido">
                      Despido
                    </option>

                    <option value="Mutuo acuerdo">
                      Mutuo acuerdo
                    </option>

                    <option value="Otra">
                      Otra
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Observación
                  </label>

                  <textarea
                    name="observacionSalida"
                    value={
                      formularioRetiro.observacionSalida
                    }
                    onChange={
                      manejarCambioRetiro
                    }
                    placeholder="Observación adicional (opcional)"
                    rows="4"
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarFormularioRetiro}
                  disabled={retirando}
                >
                  <i className="bi bi-x-lg"></i>

                  <span>
                    Cancelar
                  </span>
                </button>

                <button
                  type="submit"
                  className="danger-button"
                  disabled={retirando}
                >
                  <i
                    className={
                      retirando
                        ? 'bi bi-hourglass-split'
                        : 'bi bi-person-dash'
                    }
                  ></i>

                  <span>
                    {retirando
                      ? 'Retirando...'
                      : 'Confirmar retiro'}
                  </span>
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}

export default Empleados