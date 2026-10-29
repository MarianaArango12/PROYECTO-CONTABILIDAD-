import { useEffect, useState } from 'react'

import { obtenerEmpleados } from '../services/empleados.service'
import { obtenerTurnos, crearTurno } from '../services/turnos.service'
import {
  obtenerProgramaciones,
  crearProgramacion,
  generarProgramaciones,
  actualizarProgramacion,
  cambiarEstadoProgramacion,
  eliminarProgramacion,
} from '../services/programacion.service'

// NUEVO: generación masiva de programaciones (varios empleados)
import GeneradorMasivo from '../components/GeneradorMasivo'

function Programaciones() {
  const [empleados, setEmpleados] = useState([])
  const [turnos, setTurnos] = useState([])
  const [programaciones, setProgramaciones] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [generandoPeriodo, setGenerandoPeriodo] = useState(false)

  const [mostrarModalTurno, setMostrarModalTurno] = useState(false)

  const [formularioTurno, setFormularioTurno] = useState({
    nombre: '',
    horaEntrada: '',
    horaSalida: '',
    horasProgramadas: '',
    tipo: 'DIA',
  })

  const [editandoId, setEditandoId] = useState(null)
  const [accionAbierta, setAccionAbierta] = useState(null)
  const [seccionAbierta, setSeccionAbierta] = useState('programacion')

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [filtros, setFiltros] = useState({
    empleado: '',
    estado: '',
    tipo: '',
    desde: '',
    hasta: '',
    texto: '',
  })

  const [formulario, setFormulario] = useState({
    empleadoId: '',
    turnoId: '',
    fecha: '',
    horaEntrada: '',
    horaSalida: '',
    horasProgramadas: '',
    tipo: 'TRABAJO',
    estado: 'PROGRAMADO',
    observaciones: '',
  })

  const [periodo, setPeriodo] = useState({
    fechaInicio: '',
    fechaFin: '',
    empleadoId: '',
  })

  const [patron, setPatron] = useState({
    tipo: 'ROTATIVO',
    diasTrabajo: 4,
    diasDescanso: 2,
    turnoTrabajoId: '',
    inicioCiclo: 'DIA',
  })

  // NUEVO: modo de generación y secuencia personalizada.
  const [modoGenerador, setModoGenerador] = useState('ciclo')

  const [secuencia, setSecuencia] = useState([
    { tipo: 'TRABAJO', turnoId: '' },
    { tipo: 'DESCANSO', turnoId: '' },
  ])

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError('')

      const [
        empleadosResponse,
        turnosResponse,
        programacionesResponse,
      ] = await Promise.all([
        obtenerEmpleados(),
        obtenerTurnos(),
        obtenerProgramaciones(),
      ])

      console.log('EMPLEADOS:', empleadosResponse)

      setEmpleados(
        Array.isArray(empleadosResponse)
          ? empleadosResponse
          : empleadosResponse?.data || []
      )

      setTurnos(
        Array.isArray(turnosResponse)
          ? turnosResponse
          : turnosResponse?.data || []
      )

      setProgramaciones(
        Array.isArray(programacionesResponse)
          ? programacionesResponse
          : programacionesResponse?.data || []
      )
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudieron cargar las programaciones')
    } finally {
      setCargando(false)
    }
  }

  function convertirHoraA24(valor) {
    if (!valor) return ''

    const texto = String(valor).trim().toUpperCase()

    // 18:00
    if (/^\d{1,2}:\d{2}$/.test(texto)) {
      const [hora, minutos] = texto.split(':').map(Number)

      if (
        hora >= 0 &&
        hora <= 23 &&
        minutos >= 0 &&
        minutos <= 59
      ) {
        return `${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
      }
    }

    // 1800
    if (/^\d{4}$/.test(texto)) {
      const hora = Number(texto.slice(0, 2))
      const minutos = Number(texto.slice(2, 4))

      if (
        hora >= 0 &&
        hora <= 23 &&
        minutos >= 0 &&
        minutos <= 59
      ) {
        return `${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
      }
    }

    // 6:00 PM
    const coincidencia = texto.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)

    if (coincidencia) {
      let hora = Number(coincidencia[1])
      const minutos = Number(coincidencia[2])
      const periodoDia = coincidencia[3]

      if (hora >= 1 && hora <= 12 && minutos >= 0 && minutos <= 59) {
        if (periodoDia === 'AM') {
          if (hora === 12) hora = 0
        } else {
          if (hora !== 12) hora += 12
        }

        return `${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
      }
    }

    return valor
  }

  function calcularHorasEntreHoras(horaEntrada, horaSalida) {
    if (!horaEntrada || !horaSalida) return ''

    const entrada = convertirHoraA24(horaEntrada)
    const salida = convertirHoraA24(horaSalida)

    if (!entrada || !salida) return ''

    const [horaEntradaNumero, minutoEntrada] = entrada
      .split(':')
      .map(Number)

    const [horaSalidaNumero, minutoSalida] = salida
      .split(':')
      .map(Number)

    let minutosEntrada =
      horaEntradaNumero * 60 + minutoEntrada

    let minutosSalida =
      horaSalidaNumero * 60 + minutoSalida

    if (minutosSalida <= minutosEntrada) {
      minutosSalida += 24 * 60
    }

    return Number(
      ((minutosSalida - minutosEntrada) / 60).toFixed(2)
    )
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target

    console.log('CAMBIO:', name, value)

    setFormulario((actual) => {
      const nuevo = {
        ...actual,
        [name]: value,
      }

      if (name === 'turnoId') {
        const turno = turnos.find(
          (item) => item.id === value
        )

        if (turno) {
          nuevo.tipo = 'TRABAJO'

          nuevo.horaEntrada =
            turno.horaEntrada || ''

          nuevo.horaSalida =
            turno.horaSalida || ''

          nuevo.horasProgramadas =
            turno.horasProgramadas !== null &&
            turno.horasProgramadas !== undefined
              ? String(turno.horasProgramadas)
              : ''
        }
      }

      if (name === 'tipo' && value === 'DESCANSO') {
        nuevo.turnoId = ''
        nuevo.horaEntrada = ''
        nuevo.horaSalida = ''
        nuevo.horasProgramadas = '0'
      }

      if (name === 'tipo' && value === 'TRABAJO') {
        nuevo.turnoId = ''
        nuevo.horaEntrada = ''
        nuevo.horaSalida = ''
        nuevo.horasProgramadas = ''
      }

      if (
        name === 'horaEntrada' ||
        name === 'horaSalida'
      ) {
        const entrada =
          name === 'horaEntrada'
            ? value
            : actual.horaEntrada

        const salida =
          name === 'horaSalida'
            ? value
            : actual.horaSalida

        const horas = calcularHorasEntreHoras(
          entrada,
          salida
        )

        if (horas !== '') {
          nuevo.horasProgramadas = String(horas)
        }
      }

      return nuevo
    })
  }

  function manejarCambioTurno(evento) {
    const { name, value } = evento.target

    setFormularioTurno((actual) => {
      const nuevo = {
        ...actual,
        [name]: value,
      }

      // Si cambia nuevamente a un tipo de turno
      // normal, se limpian las horas para que pueda
      // ingresar el nuevo horario.
      if (name === 'tipo') {
        nuevo.horaEntrada = ''
        nuevo.horaSalida = ''
        nuevo.horasProgramadas = ''
      }

      if (
        (name === 'horaEntrada' ||
          name === 'horaSalida') &&
        nuevo.tipo !== 'DESCANSO'
      ) {
        const entrada =
          name === 'horaEntrada'
            ? value
            : actual.horaEntrada

        const salida =
          name === 'horaSalida'
            ? value
            : actual.horaSalida

        const horas = calcularHorasEntreHoras(
          entrada,
          salida
        )

        if (horas !== '') {
          nuevo.horasProgramadas = String(horas)
        }
      }

      return nuevo
    })
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      if (!formulario.empleadoId) {
        throw new Error('Debe seleccionar un empleado')
      }

      if (!formulario.fecha) {
        throw new Error('Debe seleccionar una fecha')
      }

      if (
        formulario.tipo === 'TRABAJO' &&
        !formulario.turnoId
      ) {
        throw new Error('Debe seleccionar un turno')
      }

      let horaEntrada = formulario.horaEntrada
        ? convertirHoraA24(formulario.horaEntrada)
        : null

      let horaSalida = formulario.horaSalida
        ? convertirHoraA24(formulario.horaSalida)
        : null

      let horasProgramadas =
        formulario.horasProgramadas !== ''
          ? Number(formulario.horasProgramadas)
          : null

      if (formulario.tipo === 'DESCANSO') {
        horaEntrada = null
        horaSalida = null
        horasProgramadas = 0
      }

      const datos = {
        empleadoId: formulario.empleadoId,
        turnoId:
          formulario.tipo === 'DESCANSO'
            ? null
            : formulario.turnoId,
        fecha: formulario.fecha,
        horaEntrada,
        horaSalida,
        horasProgramadas,
        tipoProgramacion: formulario.tipo,
        estado: formulario.estado,
        observacion:
          formulario.observaciones || null,
      }

      if (editandoId) {
        await actualizarProgramacion(
          editandoId,
          datos
        )

        setMensaje(
          'La programación fue actualizada correctamente.'
        )
      } else {
        await crearProgramacion(datos)

        setMensaje(
          'La programación fue creada correctamente.'
        )
      }

      limpiarFormulario()
      await cargarDatos()
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          'No se pudo guardar la programación'
      )
    } finally {
      setGuardando(false)
    }
  }


  async function eliminarProgramacionSeleccionada(programacion) {
    const fecha = programacion.fecha
      ? new Date(programacion.fecha).toLocaleDateString('es-CO', {
          timeZone: 'UTC',
        })
      : 'día seleccionado'

    const nombreEmpleado = [
      programacion.empleado?.nombres,
      programacion.empleado?.apellidos,
    ]
      .filter(Boolean)
      .join(' ') || 'este empleado'

    const confirmado = window.confirm(
      `¿Deseas eliminar permanentemente la programación de ${nombreEmpleado} del ${fecha}?\n\nEsta acción no se puede deshacer.`
    )

    if (!confirmado) return

    try {
      setError('')
      setMensaje('')
      setGuardando(true)

      await eliminarProgramacion(programacion.id)

      setProgramaciones((actuales) =>
        actuales.filter((item) => item.id !== programacion.id)
      )

      setAccionAbierta(null)
      setMensaje('Programación eliminada correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la programación.')
    } finally {
      setGuardando(false)
    }
  }


  async function manejarCrearTurno(evento) {
    evento.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      if (!formularioTurno.nombre.trim()) {
        throw new Error(
          'El nombre del turno es obligatorio'
        )
      }

      // DESCANSO no se crea como turno.
      // Se maneja únicamente desde Nueva programación.
      if (
        formularioTurno.nombre.trim().toUpperCase() ===
        'DESCANSO'
      ) {
        throw new Error(
          'DESCANSO no es un turno. Seleccione DESCANSO en el tipo de programación.'
        )
      }

      const esDescanso =
        formularioTurno.tipo === 'DESCANSO'

      let horaEntrada = null
      let horaSalida = null
      let horas = 0

      // Los turnos normales necesitan entrada y salida.
      // DESCANSO no necesita horario.
      if (!esDescanso) {
        if (
          !formularioTurno.horaEntrada ||
          !formularioTurno.horaSalida
        ) {
          throw new Error(
            'La hora de entrada y salida son obligatorias'
          )
        }

        horaEntrada = convertirHoraA24(
          formularioTurno.horaEntrada
        )

        horaSalida = convertirHoraA24(
          formularioTurno.horaSalida
        )

        const horasCalculadas =
          calcularHorasEntreHoras(
            horaEntrada,
            horaSalida
          )

        horas =
          horasCalculadas !== ''
            ? horasCalculadas
            : Number(
                formularioTurno.horasProgramadas
              )

        if (
          !Number.isFinite(horas) ||
          horas <= 0
        ) {
          throw new Error(
            'Las horas programadas no son válidas'
          )
        }
      }

      const datos = {
        nombre: formularioTurno.nombre.trim(),
        horaEntrada,
        horaSalida,
        horasProgramadas: horas,
        jornada: horas,
        tipo: formularioTurno.tipo,
        activo: true,
      }

      console.log(
        'DATOS DEL TURNO A CREAR:',
        datos
      )

      const turnoCreado = await crearTurno(datos)

      setMensaje(
        'El turno fue creado correctamente.'
      )

      setFormularioTurno({
        nombre: '',
        horaEntrada: '',
        horaSalida: '',
        horasProgramadas: '',
        tipo: 'DIA',
      })

      setMostrarModalTurno(false)

      await cargarDatos()

      if (turnoCreado?.id) {
        setFormulario((actual) => ({
          ...actual,
          turnoId: turnoCreado.id,
        }))
      }
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
          'No se pudo crear el turno'
      )
    } finally {
      setGuardando(false)
    }
  }

  function limpiarFormulario() {
    setFormulario({
      empleadoId: '',
      turnoId: '',
      fecha: '',
      horaEntrada: '',
      horaSalida: '',
      horasProgramadas: '',
      tipo: 'TRABAJO',
      estado: 'PROGRAMADO',
      observaciones: '',
    })

    setEditandoId(null)
  }

  function iniciarEdicion(programacion) {
    setEditandoId(programacion.id)

    setFormulario({
      empleadoId:
        programacion.empleadoId ||
        programacion.empleado?.id ||
        '',
      turnoId:
        programacion.tipoProgramacion === 'DESCANSO'
          ? ''
          : (
              programacion.turnoId ||
              programacion.turno?.id ||
              ''
            ),
      fecha: programacion.fecha
        ? String(programacion.fecha).slice(0, 10)
        : '',
      horaEntrada:
        programacion.horaEntrada || '',
      horaSalida:
        programacion.horaSalida || '',
      horasProgramadas:
        programacion.tipoProgramacion === 'DESCANSO'
          ? '0'
          : (
              programacion.horasProgramadas !== null &&
              programacion.horasProgramadas !== undefined
                ? String(programacion.horasProgramadas)
                : ''
            ),
      tipo:
        programacion.tipoProgramacion ||
        programacion.tipo ||
        'TRABAJO',
      estado:
        programacion.estado || 'PROGRAMADO',
      observaciones:
        programacion.observaciones || '',
    })

    setSeccionAbierta('programacion')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function cambiarEstado(id, estado) {
    try {
      setError('')
      setMensaje('')

      await cambiarEstadoProgramacion(id, estado)

      setMensaje(
        'El estado de la programación fue actualizado.'
      )

      await cargarDatos()
      setAccionAbierta(null)
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          'No se pudo cambiar el estado'
      )
    }
  }

  function manejarFiltro(evento) {
    const { name, value } = evento.target

    setFiltros((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  function obtenerNombreEmpleado(empleado) {
    if (!empleado) {
      return 'Sin empleado'
    }

    const nombres = [
      empleado.primerNombre,
      empleado.segundoNombre,
      empleado.primer_nombre,
      empleado.segundo_nombre,
      empleado.nombre1,
      empleado.nombre2,
    ]
      .filter(
        (valor) =>
          valor !== null &&
          valor !== undefined &&
          String(valor).trim() !== ''
      )
      .map((valor) => String(valor).trim())

    const apellidos = [
      empleado.primerApellido,
      empleado.segundoApellido,
      empleado.primer_apellido,
      empleado.segundo_apellido,
      empleado.apellido1,
      empleado.apellido2,
    ]
      .filter(
        (valor) =>
          valor !== null &&
          valor !== undefined &&
          String(valor).trim() !== ''
      )
      .map((valor) => String(valor).trim())

    if (nombres.length || apellidos.length) {
      return [...nombres, ...apellidos]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    if (
      empleado.nombres ||
      empleado.apellidos
    ) {
      return [
        empleado.nombres,
        empleado.apellidos,
      ]
        .filter(
          (valor) =>
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ''
        )
        .map((valor) => String(valor).trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    if (
      empleado.nombre ||
      empleado.apellido
    ) {
      return [
        empleado.nombre,
        empleado.apellido,
      ]
        .filter(
          (valor) =>
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ''
        )
        .map((valor) => String(valor).trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    return (
      empleado.nombreCompleto ||
      empleado.nombreCompletoEmpleado ||
      'Sin empleado'
    )
  }

  function obtenerDocumentoEmpleado(empleado) {
    if (!empleado) return ''

    return (
      empleado.documento ||
      empleado.numeroDocumento ||
      empleado.identificacion ||
      ''
    )
  }

  function formatearFecha(fecha) {
    if (!fecha) return ''

    const fechaTexto = String(fecha).slice(0, 10)

    const [anio, mes, dia] =
      fechaTexto.split('-')

    if (!anio || !mes || !dia) {
      return fechaTexto
    }

    return `${dia}/${mes}/${anio}`
  }

  function obtenerClaseEstado(estado) {
    switch (estado) {
      case 'CUMPLIDO':
        return 'bg-success'
      case 'PROGRAMADO':
        return 'bg-primary'
      case 'CAMBIO':
        return 'bg-warning text-dark'
      case 'AUSENCIA':
        return 'bg-danger'
      case 'CANCELADO':
        return 'bg-secondary'
      default:
        return 'bg-secondary'
    }
  }

  function obtenerProgramacionesFiltradas() {
    return programaciones.filter(
      (programacion) => {
        const empleado =
          programacion.empleado

        const nombreEmpleado =
          obtenerNombreEmpleado(empleado)
            .toLowerCase()

        const documento =
          obtenerDocumentoEmpleado(empleado)
            .toLowerCase()

        const texto =
          filtros.texto
            .toLowerCase()
            .trim()

        if (
          texto &&
          !nombreEmpleado.includes(texto) &&
          !documento.includes(texto)
        ) {
          return false
        }

        if (
          filtros.empleado &&
          (
            programacion.empleadoId ||
            programacion.empleado?.id
          ) !== filtros.empleado
        ) {
          return false
        }

        if (
          filtros.estado &&
          programacion.estado !== filtros.estado
        ) {
          return false
        }

        if (
          filtros.tipo &&
          (programacion.tipoProgramacion || programacion.tipo) !== filtros.tipo
        ) {
          return false
        }

        const fechaProgramacion =
          programacion.fecha
            ? String(programacion.fecha).slice(0, 10)
            : ''

        if (
          filtros.desde &&
          fechaProgramacion < filtros.desde
        ) {
          return false
        }

        if (
          filtros.hasta &&
          fechaProgramacion > filtros.hasta
        ) {
          return false
        }

        return true
      }
    )
  }

  // NUEVO: añadir un día a la secuencia personalizada.
  function agregarElementoSecuencia() {
    setSecuencia((actual) => [
      ...actual,
      { tipo: 'TRABAJO', turnoId: '' },
    ])
  }

  // NUEVO: cambiar el tipo de día o el turno de una posición.
  function cambiarElementoSecuencia(indice, campo, valor) {
    setSecuencia((actual) =>
      actual.map((elemento, i) => {
        if (i !== indice) return elemento

        if (campo === 'tipo') {
          return {
            tipo: valor,
            turnoId: '',
          }
        }

        return {
          ...elemento,
          [campo]: valor,
        }
      })
    )
  }

  // NUEVO: eliminar una posición de la secuencia.
  function eliminarElementoSecuencia(indice) {
    setSecuencia((actual) =>
      actual.filter((_, i) => i !== indice)
    )
  }

  async function manejarGenerarPeriodo(evento) {
    evento.preventDefault()

    try {
      setGenerandoPeriodo(true)
      setError('')
      setMensaje('')

      if (!periodo.fechaInicio) {
        throw new Error(
          'Debe seleccionar la fecha inicial'
        )
      }

      if (!periodo.fechaFin) {
        throw new Error(
          'Debe seleccionar la fecha final'
        )
      }

      if (!periodo.empleadoId) {
        throw new Error(
          'Debe seleccionar un empleado'
        )
      }

      if (periodo.fechaFin < periodo.fechaInicio) {
        throw new Error(
          'La fecha final no puede ser menor que la fecha inicial'
        )
      }

      let datos

      if (modoGenerador === 'secuencia') {
        if (secuencia.length === 0) {
          throw new Error(
            'Agregue al menos un día a la secuencia'
          )
        }

        const patronPersonalizado = secuencia.map(
          (elemento, indice) => {
            if (elemento.tipo === 'DESCANSO') {
              return {
                tipo: 'DESCANSO',
              }
            }

            if (!elemento.turnoId) {
              throw new Error(
                `Seleccione un turno para el día ${indice + 1} de la secuencia`
              )
            }

            return {
              tipo: 'TRABAJO',
              turnoId: elemento.turnoId,
            }
          }
        )

        if (
          !patronPersonalizado.some(
            (elemento) => elemento.tipo === 'TRABAJO'
          )
        ) {
          throw new Error(
            'La secuencia debe contener al menos un día de trabajo'
          )
        }

        datos = {
          empleadoId: periodo.empleadoId,
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          patron: patronPersonalizado,
          posicionInicial: 1,
          estado: 'PROGRAMADO',
        }
      } else {
        if (!patron.turnoTrabajoId) {
          throw new Error(
            'Debe seleccionar el turno'
          )
        }

        if (
          !Number.isInteger(Number(patron.diasTrabajo)) ||
          Number(patron.diasTrabajo) < 1
        ) {
          throw new Error(
            'Los días de trabajo deben ser un número entero mayor que cero'
          )
        }

        if (
          !Number.isInteger(Number(patron.diasDescanso)) ||
          Number(patron.diasDescanso) < 1
        ) {
          throw new Error(
            'Los días de descanso deben ser un número entero mayor que cero'
          )
        }

        datos = {
          empleadoId: periodo.empleadoId,
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          tipo: patron.tipo,
          diasTrabajo: Number(patron.diasTrabajo),
          diasDescanso: Number(patron.diasDescanso),
          turnoId: patron.turnoTrabajoId,
          inicioCiclo: patron.inicioCiclo,
          estado: 'PROGRAMADO',
        }
      }

      console.log(
        'DATOS PARA GENERAR PROGRAMACIONES:',
        datos
      )

      const resultado = await generarProgramaciones(datos)

      setMensaje(
        resultado?.mensaje ||
          'Se procesó la generación de programaciones. Revisa el resultado y la tabla.'
      )

      await cargarDatos()
    } catch (err) {
      console.error(err)
      setError(
        err.message ||
          'No se pudieron generar las programaciones'
      )
    } finally {
      setGenerandoPeriodo(false)
    }
  }

  const programacionesFiltradas =
    obtenerProgramacionesFiltradas()

  if (cargando) {
    return (
      <div className="container py-4">
        <div className="text-center py-5">
          <div
            className="spinner-border"
            role="status"
          >
            <span className="visually-hidden">
              Cargando...
            </span>
          </div>

          <p className="mt-3">
            Cargando programaciones...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            Programaciones
          </h2>

          <p className="text-muted mb-0">
            Gestión de turnos y programaciones de empleados
          </p>
        </div>

        <button
          type="button"
          className="btn btn-dark"
          onClick={() =>
            setMostrarModalTurno(true)
          }
        >
          Crear nuevo turno
        </button>
      </div>

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
          className="alert alert-success"
          role="alert"
        >
          {mensaje}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <button
            type="button"
            className="btn btn-link text-decoration-none text-dark w-100 text-start p-0"
            onClick={() =>
              setSeccionAbierta(
                seccionAbierta === 'programacion'
                  ? ''
                  : 'programacion'
              )
            }
          >
            <strong>
              {editandoId
                ? 'Editar programación'
                : 'Nueva programación'}
            </strong>
          </button>
        </div>

        {seccionAbierta === 'programacion' && (
          <div className="card-body">
            <form onSubmit={manejarGuardar}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">
                    Empleado
                  </label>

                  <select
                    className="form-select"
                    name="empleadoId"
                    value={formulario.empleadoId}
                    onChange={manejarCambio}
                  >
                    <option value="">
                      Seleccionar empleado
                    </option>

                    {empleados.map(
                      (empleado) => (
                        <option
                          key={empleado.id}
                          value={empleado.id}
                        >
                          {obtenerNombreEmpleado(
                            empleado
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {formulario.tipo === 'TRABAJO' && (
                  <div className="col-md-4">
                    <label className="form-label">
                      Turno
                    </label>

                    <select
                      className="form-select"
                      name="turnoId"
                      value={formulario.turnoId}
                      onChange={manejarCambio}
                    >
                      <option value="">
                        Seleccionar turno
                      </option>

                      {turnos
                        .filter(
                          (turno) =>
                            turno.activo !== false
                        )
                        .map((turno) => (
                          <option
                            key={turno.id}
                            value={turno.id}
                          >
                            {turno.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="col-md-4">
                  <label className="form-label">
                    Fecha
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    name="fecha"
                    value={formulario.fecha}
                    onChange={manejarCambio}
                  />
                </div>

                {formulario.tipo === 'TRABAJO' && (
                  <>
                    <div className="col-md-3">
                      <label className="form-label">
                        Hora entrada
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="horaEntrada"
                        value={
                          formulario.horaEntrada
                        }
                        onChange={manejarCambio}
                        placeholder="06:00"
                      />

                      <small className="text-muted">
                        Ejemplo: 06:00, 1800 o 6:00 PM
                      </small>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        Hora salida
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="horaSalida"
                        value={
                          formulario.horaSalida
                        }
                        onChange={manejarCambio}
                        placeholder="18:00"
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        Horas programadas
                      </label>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        name="horasProgramadas"
                        value={
                          formulario.horasProgramadas
                        }
                        onChange={manejarCambio}
                      />
                    </div>
                  </>
                )}

                <div className="col-md-3">
                  <label className="form-label">
                    Tipo
                  </label>

                  <select
                    className="form-select"
                    name="tipo"
                    value={formulario.tipo}
                    onChange={manejarCambio}
                  >
                    <option value="TRABAJO">
                      TRABAJO
                    </option>

                    <option value="DESCANSO">
                      DESCANSO
                    </option>
                  </select>
                </div>

                {formulario.tipo === 'DESCANSO' && (
                  <div className="col-12">
                    <div className="alert alert-light border mb-0">
                      <strong>DESCANSO</strong>

                      <div className="small text-muted mt-1">
                        Este día no requiere turno ni horario.
                        Las horas programadas serán 0.
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-md-4">
                  <label className="form-label">
                    Estado
                  </label>

                  <select
                    className="form-select"
                    name="estado"
                    value={formulario.estado}
                    onChange={manejarCambio}
                  >
                    <option value="PROGRAMADO">
                      PROGRAMADO
                    </option>

                    <option value="CUMPLIDO">
                      CUMPLIDO
                    </option>

                    <option value="CAMBIO">
                      CAMBIO
                    </option>

                    <option value="AUSENCIA">
                      AUSENCIA
                    </option>

                    <option value="CANCELADO">
                      CANCELADO
                    </option>
                  </select>
                </div>

                <div className="col-md-8">
                  <label className="form-label">
                    Observaciones
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="observaciones"
                    value={
                      formulario.observaciones
                    }
                    onChange={manejarCambio}
                  />
                </div>

                <div className="col-12 d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Guardando...'
                      : editandoId
                      ? 'Actualizar programación'
                      : 'Guardar programación'}
                  </button>

                  {editandoId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={
                        limpiarFormulario
                      }
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>


      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <button
            type="button"
            className="btn btn-link text-decoration-none text-dark w-100 text-start p-0"
            onClick={() =>
              setSeccionAbierta(
                seccionAbierta === 'generador'
                  ? ''
                  : 'generador'
              )
            }
          >
            <strong>
              Generar programaciones por período
            </strong>
          </button>
        </div>

        {seccionAbierta === 'generador' && (
          <div className="card-body">
            <form
              onSubmit={manejarGenerarPeriodo}
            >
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">
                    Empleado
                  </label>

                  <select
                    className="form-select"
                    value={periodo.empleadoId}
                    onChange={(evento) =>
                      setPeriodo((actual) => ({
                        ...actual,
                        empleadoId:
                          evento.target.value,
                      }))
                    }
                  >
                    <option value="">
                      Seleccionar empleado
                    </option>

                    {empleados.map(
                      (empleado) => (
                        <option
                          key={empleado.id}
                          value={empleado.id}
                        >
                          {obtenerNombreEmpleado(
                            empleado
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Fecha inicio
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={periodo.fechaInicio}
                    onChange={(evento) =>
                      setPeriodo((actual) => ({
                        ...actual,
                        fechaInicio:
                          evento.target.value,
                      }))
                    }
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Fecha fin
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={periodo.fechaFin}
                    onChange={(evento) =>
                      setPeriodo((actual) => ({
                        ...actual,
                        fechaFin:
                          evento.target.value,
                      }))
                    }
                  />
                </div>

                {/* NUEVO: selector del modo de generación. */}
                <div className="col-12">
                  <label className="form-label">
                    Método de generación
                  </label>

                  <select
                    className="form-select"
                    value={modoGenerador}
                    onChange={(evento) =>
                      setModoGenerador(evento.target.value)
                    }
                  >
                    <option value="ciclo">
                      Ciclo repetitivo con un mismo turno
                    </option>

                    <option value="secuencia">
                      Secuencia personalizada de turnos
                    </option>
                  </select>

                  <small className="text-muted">
                    Puedes usar un ciclo sencillo o combinar diferentes turnos y descansos en una secuencia.
                  </small>
                </div>

                {modoGenerador === 'ciclo' ? (
                  <>
                    <div className="col-md-3">
                      <label className="form-label">
                        Tipo de programación
                      </label>

                      <select
                        className="form-select"
                        value={patron.tipo}
                        onChange={(evento) =>
                          setPatron((actual) => ({
                            ...actual,
                            tipo: evento.target.value,
                          }))
                        }
                      >
                        <option value="ROTATIVO">
                          ROTATIVO
                        </option>

                        <option value="FIJO">
                          FIJO
                        </option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        Inicio del ciclo
                      </label>

                      <select
                        className="form-select"
                        value={patron.inicioCiclo}
                        onChange={(evento) =>
                          setPatron((actual) => ({
                            ...actual,
                            inicioCiclo: evento.target.value,
                          }))
                        }
                      >
                        <option value="DIA">
                          DÍA
                        </option>

                        <option value="NOCHE">
                          NOCHE
                        </option>

                        <option value="DESCANSO">
                          DESCANSO
                        </option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        Días de trabajo
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-control"
                        value={patron.diasTrabajo}
                        onChange={(evento) =>
                          setPatron((actual) => ({
                            ...actual,
                            diasTrabajo: evento.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        Días de descanso
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-control"
                        value={patron.diasDescanso}
                        onChange={(evento) =>
                          setPatron((actual) => ({
                            ...actual,
                            diasDescanso: evento.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Turno de trabajo
                      </label>

                      <select
                        className="form-select"
                        value={patron.turnoTrabajoId}
                        onChange={(evento) =>
                          setPatron((actual) => ({
                            ...actual,
                            turnoTrabajoId: evento.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Seleccionar turno
                        </option>

                        {turnos
                          .filter(
                            (turno) =>
                              turno.activo !== false
                          )
                          .map((turno) => (
                            <option
                              key={turno.id}
                              value={turno.id}
                            >
                              {turno.nombre}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="alert alert-light border mb-0">
                        <strong>Ejemplo:</strong> 4 días de trabajo
                        con el turno seleccionado y 2 días de descanso.
                        El patrón se repetirá durante el período.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                        <div>
                          <h6 className="mb-1">
                            Secuencia de turnos
                          </h6>

                          <small className="text-muted">
                            Define el orden de los días. La secuencia
                            completa se repetirá desde la fecha inicial.
                          </small>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm"
                          onClick={agregarElementoSecuencia}
                        >
                          Agregar día
                        </button>
                      </div>

                      <div className="table-responsive">
                        <table className="table table-bordered align-middle">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: '90px' }}>
                                Posición
                              </th>

                              <th style={{ width: '220px' }}>
                                Tipo de día
                              </th>

                              <th>
                                Turno y duración
                              </th>

                              <th style={{ width: '100px' }}>
                                Acción
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {secuencia.map((elemento, indice) => {
                              const turnoSeleccionado = turnos.find(
                                (turno) =>
                                  turno.id === elemento.turnoId
                              )

                              return (
                                <tr key={indice}>
                                  <td>
                                    <strong>
                                      {indice + 1}
                                    </strong>
                                  </td>

                                  <td>
                                    <select
                                      className="form-select"
                                      value={elemento.tipo}
                                      onChange={(evento) =>
                                        cambiarElementoSecuencia(
                                          indice,
                                          'tipo',
                                          evento.target.value
                                        )
                                      }
                                    >
                                      <option value="TRABAJO">
                                        TRABAJO
                                      </option>

                                      <option value="DESCANSO">
                                        DESCANSO
                                      </option>
                                    </select>
                                  </td>

                                  <td>
                                    {elemento.tipo === 'TRABAJO' ? (
                                      <>
                                        <select
                                          className="form-select"
                                          value={elemento.turnoId}
                                          onChange={(evento) =>
                                            cambiarElementoSecuencia(
                                              indice,
                                              'turnoId',
                                              evento.target.value
                                            )
                                          }
                                        >
                                          <option value="">
                                            Seleccionar turno
                                          </option>

                                          {turnos
                                            .filter(
                                              (turno) =>
                                                turno.activo !== false
                                            )
                                            .map((turno) => (
                                              <option
                                                key={turno.id}
                                                value={turno.id}
                                              >
                                                {turno.nombre}
                                                {turno.horasProgramadas != null
                                                  ? ` — ${turno.horasProgramadas} horas`
                                                  : ''}
                                              </option>
                                            ))}
                                        </select>

                                        {turnoSeleccionado && (
                                          <small className="text-muted d-block mt-1">
                                            Horario:{' '}
                                            {turnoSeleccionado.horaEntrada ||
                                              'Sin hora de entrada'}
                                            {' - '}
                                            {turnoSeleccionado.horaSalida ||
                                              'Sin hora de salida'}
                                          </small>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-muted">
                                        Descanso — 0 horas programadas
                                      </span>
                                    )}
                                  </td>

                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm"
                                      disabled={secuencia.length === 1}
                                      onClick={() =>
                                        eliminarElementoSecuencia(indice)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="alert alert-light border mb-0">
                        <strong>Importante:</strong> cada posición
                        representa un día de la rotación. Si necesitas
                        dos noches seguidas, agrega dos posiciones de
                        trabajo y selecciona el turno correspondiente
                        en ambas.
                      </div>
                    </div>
                  </>
                )}

                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={generandoPeriodo}
                  >
                    {generandoPeriodo
                      ? 'Generando...'
                      : 'Generar programaciones'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* NUEVO: generación masiva (varios empleados, con vista previa) */}
      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <button
            type="button"
            className="btn btn-link text-decoration-none text-dark w-100 text-start p-0"
            onClick={() =>
              setSeccionAbierta(
                seccionAbierta === 'masivo'
                  ? ''
                  : 'masivo'
              )
            }
          >
            <strong>
              Generación masiva (varios empleados)
            </strong>
          </button>
        </div>

        {seccionAbierta === 'masivo' && (
          <div className="card-body">
            <GeneradorMasivo
              empleados={empleados}
              turnos={turnos}
              onGuardado={cargarDatos}
            />
          </div>
        )}
      </div>

      <div className="card shadow-sm">
        <div className="card-header">
          <strong>
            Programaciones registradas
          </strong>
        </div>

        <div className="card-body">
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label">
                Buscar empleado
              </label>

              <input
                type="text"
                className="form-control"
                name="texto"
                value={filtros.texto}
                onChange={manejarFiltro}
                placeholder="Nombre o documento"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">
                Empleado
              </label>

              <select
                className="form-select"
                name="empleado"
                value={filtros.empleado}
                onChange={manejarFiltro}
              >
                <option value="">
                  Todos
                </option>

                {empleados.map(
                  (empleado) => (
                    <option
                      key={empleado.id}
                      value={empleado.id}
                    >
                      {obtenerNombreEmpleado(
                        empleado
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">
                Estado
              </label>

              <select
                className="form-select"
                name="estado"
                value={filtros.estado}
                onChange={manejarFiltro}
              >
                <option value="">
                  Todos
                </option>

                <option value="PROGRAMADO">
                  PROGRAMADO
                </option>

                <option value="CUMPLIDO">
                  CUMPLIDO
                </option>

                <option value="CAMBIO">
                  CAMBIO
                </option>

                <option value="AUSENCIA">
                  AUSENCIA
                </option>

                <option value="CANCELADO">
                  CANCELADO
                </option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">
                Tipo
              </label>

              <select
                className="form-select"
                name="tipo"
                value={filtros.tipo}
                onChange={manejarFiltro}
              >
                <option value="">
                  Todos
                </option>

                <option value="TRABAJO">
                  TRABAJO
                </option>

                <option value="DESCANSO">
                  DESCANSO
                </option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">
                Desde
              </label>

              <input
                type="date"
                className="form-control"
                name="desde"
                value={filtros.desde}
                onChange={manejarFiltro}
              />
            </div>

            <div className="col-md-2">
              <label className="form-label">
                Hasta
              </label>

              <input
                type="date"
                className="form-control"
                name="hasta"
                value={filtros.hasta}
                onChange={manejarFiltro}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Empleado</th>
                  <th>Documento</th>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Horario</th>
                  <th>Horas</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {programacionesFiltradas.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center text-muted py-4"
                    >
                      No hay programaciones para mostrar.
                    </td>
                  </tr>
                ) : (
                  programacionesFiltradas.map(
                    (programacion) => {
                      const empleado =
                        programacion.empleado

                      const turno =
                        programacion.turno

                      return (
                        <tr
                          key={programacion.id}
                        >
                          <td>
                            <strong>
                              {obtenerNombreEmpleado(
                                empleado
                              )}
                            </strong>
                          </td>

                          <td>
                            {obtenerDocumentoEmpleado(
                              empleado
                            )}
                          </td>

                          <td>
                            {formatearFecha(
                              programacion.fecha
                            )}
                          </td>

                          <td>
                            {turno?.nombre ||
                              'Sin turno'}
                          </td>

                          <td>
                            {programacion.horaEntrada &&
                            programacion.horaSalida
                              ? `${programacion.horaEntrada} - ${programacion.horaSalida}`
                              : '—'}
                          </td>

                          <td>
                            {programacion.horasProgramadas !==
                              null &&
                            programacion.horasProgramadas !==
                              undefined
                              ? Number(
                                  programacion.horasProgramadas
                                ).toFixed(2)
                              : '—'}
                          </td>

                          <td>
                            {programacion.tipoProgramacion ||
                              programacion.tipo ||
                              '—'}
                          </td>

                          <td>
                            <span
                              className={`badge ${obtenerClaseEstado(
                                programacion.estado
                              )}`}
                            >
                              {programacion.estado}
                            </span>
                          </td>

                          <td>
                            <div className="dropdown">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                  setAccionAbierta(
                                    accionAbierta ===
                                      programacion.id
                                      ? null
                                      : programacion.id
                                  )
                                }
                              >
                                Acciones
                              </button>

                              {accionAbierta ===
                                programacion.id && (
                                <div
                                  className="dropdown-menu show"
                                  style={{
                                    position:
                                      'absolute',
                                    right: 0,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                      iniciarEdicion(
                                        programacion
                                      )
                                    }
                                  >
                                    Editar
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                      cambiarEstado(
                                        programacion.id,
                                        'CUMPLIDO'
                                      )
                                    }
                                  >
                                    Marcar cumplido
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                      cambiarEstado(
                                        programacion.id,
                                        'CAMBIO'
                                      )
                                    }
                                  >
                                    Marcar cambio
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() =>
                                      cambiarEstado(
                                        programacion.id,
                                        'AUSENCIA'
                                      )
                                    }
                                  >
                                    Marcar ausencia
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item text-danger"
                                    onClick={() =>
                                      cambiarEstado(
                                        programacion.id,
                                        'CANCELADO'
                                      )
                                    }
                                  >
                                    Cancelar
                                  </button>


                                    <button
                                      type="button"
                                      className="dropdown-item text-danger"
                                      disabled={guardando}
                                      onClick={() =>
                                        eliminarProgramacionSeleccionada(programacion)
                                      }
                                    >
                                      Eliminar permanentemente
                                    </button>

                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {mostrarModalTurno && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor:
              'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form
                onSubmit={manejarCrearTurno}
              >
                <div className="modal-header">
                  <h5 className="modal-title">
                    Crear nuevo turno
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={() =>
                      setMostrarModalTurno(false)
                    }
                  />
                </div>

                <div className="modal-body">
                  <p className="text-muted">
                    Registra un horario nuevo para utilizarlo en las programaciones.
                  </p>

                  <div className="mb-3">
                    <label className="form-label">
                      Nombre del turno
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={
                        formularioTurno.nombre
                      }
                      onChange={
                        manejarCambioTurno
                      }
                      placeholder="Ejemplo: Turno 7 horas"
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Hora entrada
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="horaEntrada"
                        value={
                          formularioTurno.horaEntrada
                        }
                        onChange={
                          manejarCambioTurno
                        }
                        placeholder="06:00"
                      />

                      <small className="text-muted">
                        Puede escribir 06:00, 0600 o 6:00 AM
                      </small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Hora salida
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        name="horaSalida"
                        value={
                          formularioTurno.horaSalida
                        }
                        onChange={
                          manejarCambioTurno
                        }
                        placeholder="18:00"
                      />

                      <small className="text-muted">
                        Puede escribir 18:00, 1800 o 6:00 PM
                      </small>
                    </div>
                  </div>

                  <div className="mb-3 mt-3">
                    <label className="form-label">
                      Horas programadas
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      name="horasProgramadas"
                      value={
                        formularioTurno.horasProgramadas
                      }
                      onChange={
                        manejarCambioTurno
                      }
                      readOnly
                    />

                    <small className="text-muted">
                      Se calcula automáticamente a partir de la entrada y salida.
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Tipo
                    </label>

                    <select
                      className="form-select"
                      name="tipo"
                      value={
                        formularioTurno.tipo
                      }
                      onChange={
                        manejarCambioTurno
                      }
                    >
                      <option value="DIA">
                        DÍA
                      </option>

                      <option value="NOCHE">
                        NOCHE
                      </option>

                      <option value="MIXTO">
                        MIXTO
                      </option>

                      <option value="FIJO">
                        FIJO
                      </option>

                      <option value="ROTATIVO">
                        ROTATIVO
                      </option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setMostrarModalTurno(false)
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Creando...'
                      : 'Crear turno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Programaciones
