import prisma from '../config/database.js';

// Selects reutilizables (idénticos a los que ya tenías)
const SELECT_EMPLEADO = {
  id: true,
  nombres: true,
  apellidos: true,
  documento: true,
  activo: true
};

const SELECT_TURNO = {
  id: true,
  nombre: true,
  horaEntrada: true,
  horaSalida: true,
  horasProgramadas: true,
  tipo: true,
  activo: true
};

// El descanso no es un horario de trabajo.
// turnoId es obligatorio en la BD, así que se usa
// un turno interno "Descanso" con 0 horas.
// Ese turno no cuenta como horas ordinarias, extras ni recargos.
async function obtenerOCrearTurnoDescanso() {
  let turnoDescanso = await prisma.turno.findFirst({
    where: {
      nombre: {
        equals: 'Descanso',
        mode: 'insensitive'
      }
    }
  });

  if (!turnoDescanso) {
    turnoDescanso = await prisma.turno.create({
      data: {
        nombre: 'Descanso',
        descripcion: 'Día de descanso. No genera horas.',
        horaEntrada: null,
        horaSalida: null,
        horasProgramadas: 0,
        jornada: 0,
        tipo: 'DIA',
        activo: true
      }
    });
  }

  return turnoDescanso;
}

export async function crearProgramacion(req, res) {
  try {
    const {
      empleadoId,
      turnoId,
      fecha,
      horaEntrada,
      horaSalida,
      horasProgramadas,
      tipoProgramacion,
      observacion
    } = req.body;

    // El turno no es obligatorio aquí:
    // un descanso puede ir sin turno desde el formulario.
    if (!empleadoId || !fecha) {
      return res.status(400).json({
        error: 'empleadoId y fecha son obligatorios'
      });
    }

    // Acepta tipoProgramacion o tipo
    // para mantener la compatibilidad con el frontend.
    const tipo = tipoProgramacion ?? req.body.tipo ?? 'TRABAJO';

    if (!['TRABAJO', 'DESCANSO'].includes(tipo)) {
      return res.status(400).json({
        error: 'tipoProgramacion no válido'
      });
    }

    // Validar fecha y año.
    const fechaProgramacion = new Date(fecha);

    if (Number.isNaN(fechaProgramacion.getTime())) {
      return res.status(400).json({
        error: 'Fecha no válida'
      });
    }

    const anio = fechaProgramacion.getUTCFullYear();

    if (anio < 2000 || anio > 2100) {
      return res.status(400).json({
        error: 'Fecha no válida: revise el año'
      });
    }

    // Verificar empleado.
    const empleado = await prisma.empleado.findUnique({
      where: {
        id: empleadoId
      }
    });

    if (!empleado) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    if (!empleado.activo) {
      return res.status(400).json({
        error: 'No se puede programar un empleado inactivo'
      });
    }

    // DESCANSO: no pide turno al usuario.
    // Si no existe el turno interno, lo crea con 0 horas.
    // TRABAJO: el turno sigue siendo obligatorio.
    let turnoFinalId = turnoId;

    if (tipo === 'DESCANSO') {
      const turnoDescanso = await obtenerOCrearTurnoDescanso();
      turnoFinalId = turnoDescanso.id;
    } else if (!turnoFinalId) {
      return res.status(400).json({
        error: 'Debe seleccionar un turno para una programación de trabajo'
      });
    }

    // Verificar turno.
    const turno = await prisma.turno.findUnique({
      where: {
        id: turnoFinalId
      }
    });

    if (!turno) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    if (!turno.activo) {
      return res.status(400).json({
        error: 'No se puede utilizar un turno inactivo'
      });
    }

    // Verificar programación existente.
    const programacionExistente =
      await prisma.programacion.findFirst({
        where: {
          empleadoId,
          fecha: fechaProgramacion
        }
      });

    if (programacionExistente) {
      return res.status(409).json({
        error: 'El empleado ya tiene una programación para esa fecha'
      });
    }

    // Preparar datos según el tipo de programación.
    // El descanso no guarda horas.
    const esDescanso = tipo === 'DESCANSO';

    const programacion = await prisma.programacion.create({
      data: {
        empleadoId,
        turnoId: turnoFinalId,
        fecha: fechaProgramacion,

        tipoProgramacion: tipo,

        horaEntrada: esDescanso
          ? null
          : (horaEntrada ?? turno.horaEntrada),

        horaSalida: esDescanso
          ? null
          : (horaSalida ?? turno.horaSalida),

        horasProgramadas: esDescanso
          ? 0
          : (horasProgramadas ?? turno.horasProgramadas),

        estado: 'PROGRAMADO',

        observacion:
          observacion ?? null
      },

      include: {
        empleado: {
          select: SELECT_EMPLEADO
        },

        turno: {
          select: SELECT_TURNO
        }
      }
    });

    return res.status(201).json(programacion);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'El empleado ya tiene una programación para esa fecha'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'El empleado o el turno indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al crear la programación'
    });
  }
}



export async function listarProgramaciones(req, res) {
  try {
    const programaciones =
      await prisma.programacion.findMany({
        include: {
          empleado: {
            select: SELECT_EMPLEADO
          },

          turno: {
            select: SELECT_TURNO
          }
        },

        orderBy: {
          fecha: 'asc'
        }
      });

    return res.json(programaciones);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar las programaciones'
    });
  }
}


export async function obtenerProgramacion(req, res) {
  try {
    const { id } = req.params;

    const programacion =
      await prisma.programacion.findUnique({
        where: {
          id
        },

        include: {
          empleado: {
            select: SELECT_EMPLEADO
          },

          turno: {
            select: SELECT_TURNO
          }
        }
      });

    if (!programacion) {
      return res.status(404).json({
        error: 'Programación no encontrada'
      });
    }

    return res.json(programacion);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener la programación'
    });
  }
}


export async function actualizarProgramacion(req, res) {
  try {
    const { id } = req.params;

    const {
      turnoId,
      fecha,
      horaEntrada,
      horaSalida,
      horasProgramadas,
      tipoProgramacion,
      estado,
      observacion
    } = req.body;

    // Buscar programación.
    const programacionActual =
      await prisma.programacion.findUnique({
        where: {
          id
        }
      });

    if (!programacionActual) {
      return res.status(404).json({
        error: 'Programación no encontrada'
      });
    }

    // Verificar turno si se está cambiando.
    if (turnoId) {
      const turno = await prisma.turno.findUnique({
        where: {
          id: turnoId
        }
      });

      if (!turno) {
        return res.status(404).json({
          error: 'Turno no encontrado'
        });
      }

      if (!turno.activo) {
        return res.status(400).json({
          error: 'No se puede utilizar un turno inactivo'
        });
      }
    }

    // Mantener fecha actual si no se envía una nueva.
    let nuevaFecha = programacionActual.fecha;

    if (fecha) {
      nuevaFecha = new Date(fecha);

      // Validar fecha y año.
      if (Number.isNaN(nuevaFecha.getTime())) {
        return res.status(400).json({
          error: 'Fecha no válida'
        });
      }

      const anio = nuevaFecha.getUTCFullYear();

      if (anio < 2000 || anio > 2100) {
        return res.status(400).json({
          error: 'Fecha no válida: revise el año'
        });
      }

      // Verificar que no exista otra programación
      // para el mismo empleado y fecha.
      const otraProgramacion =
        await prisma.programacion.findFirst({
          where: {
            empleadoId: programacionActual.empleadoId,
            fecha: nuevaFecha,

            NOT: {
              id
            }
          }
        });

      if (otraProgramacion) {
        return res.status(409).json({
          error: 'El empleado ya tiene una programación para esa fecha'
        });
      }
    }

    // Acepta tipoProgramacion o tipo.
    const tipo =
      tipoProgramacion ??
      req.body.tipo ??
      programacionActual.tipoProgramacion;

    if (!['TRABAJO', 'DESCANSO'].includes(tipo)) {
      return res.status(400).json({
        error: 'tipoProgramacion no válido'
      });
    }

    const esDescanso = tipo === 'DESCANSO';

    // Si pasa a descanso, usa el turno interno de 0 horas.
    let turnoDescansoId = null;

    if (esDescanso) {
      const turnoDescanso = await obtenerOCrearTurnoDescanso();
      turnoDescansoId = turnoDescanso.id;
    }

    // Construir únicamente los campos enviados.
    const datosActualizacion = {
      fecha: nuevaFecha,

      // Solo se actualiza el turno si viene con valor.
      ...(esDescanso
        ? {
            turnoId: turnoDescansoId
          }
        : turnoId
          ? {
              turnoId
            }
          : {}),

      tipoProgramacion: tipo,

      // El descanso nunca guarda horas.
      ...(esDescanso
        ? {
            horaEntrada: null,
            horaSalida: null,
            horasProgramadas: 0
          }
        : {
            ...(horaEntrada !== undefined && {
              horaEntrada
            }),

            ...(horaSalida !== undefined && {
              horaSalida
            }),

            ...(horasProgramadas !== undefined && {
              horasProgramadas
            })
          }),

      ...(estado !== undefined && {
        estado
      }),

      ...(observacion !== undefined && {
        observacion
      })
    };

    const programacion =
      await prisma.programacion.update({
        where: {
          id
        },

        data: datosActualizacion,

        include: {
          empleado: {
            select: SELECT_EMPLEADO
          },

          turno: {
            select: SELECT_TURNO
          }
        }
      });

    return res.json(programacion);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Programación no encontrada'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'El empleado ya tiene una programación para esa fecha'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'El turno indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar la programación'
    });
  }
}


export async function cambiarEstadoProgramacion(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = [
      'PROGRAMADO',
      'CUMPLIDO',
      'CAMBIO',
      'AUSENCIA',
      'CANCELADO'
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado de programación no válido'
      });
    }

    const programacion =
      await prisma.programacion.update({
        where: {
          id
        },

        data: {
          estado
        },

        include: {
          empleado: {
            select: SELECT_EMPLEADO
          },

          turno: {
            select: SELECT_TURNO
          }
        }
      });

    return res.json(programacion);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Programación no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al cambiar el estado de la programación'
    });
  }
}


export async function obtenerProgramacionesPorEmpleado(req, res) {
  try {
    const { empleadoId } = req.params;
    const { inicio, fin } = req.query;

    // Verificar que el empleado exista.
    const empleado = await prisma.empleado.findUnique({
      where: {
        id: empleadoId
      },
      select: SELECT_EMPLEADO
    });

    if (!empleado) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    // Construir filtro.
    const filtroFecha = {};

    if (inicio) {
      filtroFecha.gte = new Date(
        `${String(inicio).slice(0, 10)}T00:00:00.000Z`
      );
    }

    if (fin) {
      filtroFecha.lte = new Date(
        `${String(fin).slice(0, 10)}T23:59:59.999Z`
      );
    }

    const programaciones =
      await prisma.programacion.findMany({
        where: {
          empleadoId,

          ...(inicio || fin
            ? {
                fecha: filtroFecha
              }
            : {})
        },

        include: {
          empleado: {
            select: SELECT_EMPLEADO
          },

          turno: {
            select: SELECT_TURNO
          }
        },

        orderBy: {
          fecha: 'asc'
        }
      });

    return res.json(programaciones);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener las programaciones del empleado'
    });
  }
}




export async function generarProgramaciones(req, res) {
  try {
    const {
      empleadoId,
      obraId,
      fechaInicio,
      fechaFin,
      patron,
      posicionInicial = 1,
      estado = 'PROGRAMADO',
      diasTrabajo,
      diasDescanso,
      turnoId,
      inicioCiclo = 'DIA'
    } = req.body;

    // Aceptar tanto el patrón detallado como los datos
    // actuales del formulario de generación automática.
    let patronFinal = patron;

    if (!Array.isArray(patronFinal) || patronFinal.length === 0) {
      const trabajo = Number(diasTrabajo);
      const descanso = Number(diasDescanso);
      const idTurno = turnoId ?? req.body.turnoTrabajoId;

      if (
        !Number.isInteger(trabajo) ||
        !Number.isInteger(descanso) ||
        trabajo < 1 ||
        descanso < 1 ||
        !idTurno
      ) {
        return res.status(400).json({
          error:
            'Debe indicar los días de trabajo, los días de descanso y el turno de trabajo'
        });
      }

      patronFinal = [
        ...Array.from({ length: trabajo }, () => ({
          tipo: 'TRABAJO',
          turnoId: idTurno
        })),
        ...Array.from({ length: descanso }, () => ({
          tipo: 'DESCANSO'
        }))
      ];
    }

    if (!['DIA', 'NOCHE', 'DESCANSO'].includes(inicioCiclo)) {
      return res.status(400).json({
        error: 'El inicio del ciclo debe ser DIA, NOCHE o DESCANSO'
      });
    }

    if (
      !empleadoId ||
      !fechaInicio ||
      !fechaFin ||
      !Array.isArray(patronFinal) ||
      patronFinal.length === 0
    ) {
      return res.status(400).json({
        error:
          'empleadoId, fechaInicio, fechaFin y patron son obligatorios'
      });
    }

    const estadosPermitidos = [
      'PROGRAMADO',
      'CUMPLIDO',
      'CAMBIO',
      'AUSENCIA',
      'CANCELADO'
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado de programación no válido'
      });
    }

    const inicio = new Date(`${fechaInicio}T00:00:00.000Z`);
    const fin = new Date(`${fechaFin}T00:00:00.000Z`);

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime()) ||
      inicio > fin
    ) {
      return res.status(400).json({
        error: 'Rango de fechas no válido'
      });
    }

    const dias = Math.round(
      (fin - inicio) / 86400000
    ) + 1;

    if (dias > 62) {
      return res.status(400).json({
        error: 'El rango máximo es de 62 días'
      });
    }

    // --------------------------------------------------
    // EMPLEADO
    // --------------------------------------------------

    const empleado = await prisma.empleado.findUnique({
      where: {
        id: empleadoId
      }
    });

    if (!empleado) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    if (!empleado.activo) {
      return res.status(400).json({
        error: 'No se puede programar un empleado inactivo'
      });
    }

    // VALIDAR PATRÓN

    for (let i = 0; i < patronFinal.length; i++) {
      const diaPatron = patronFinal[i];

      if (!diaPatron || typeof diaPatron !== 'object') {
        return res.status(400).json({
          error: `El día ${i + 1} del patrón no es válido`
        });
      }

      if (
        !['TRABAJO', 'DESCANSO'].includes(
          diaPatron.tipo
        )
      ) {
        return res.status(400).json({
          error:
            `El tipo del día ${i + 1} debe ser TRABAJO o DESCANSO`
        });
      }

      if (
        diaPatron.tipo !== 'DESCANSO' &&
        !diaPatron.turnoId
      ) {
        return res.status(400).json({
          error:
            `El día ${i + 1} debe tener un turno seleccionado`
        });
      }
    }

    // OBTENER TURNOS

    const turnoIds = [
      ...new Set(
        patronFinal
          .map((dia) => dia.turnoId)
          .filter(Boolean)
      )
    ];

    const turnos = await prisma.turno.findMany({
      where: {
        id: {
          in: turnoIds
        },
        activo: true
      }
    });

    const turnoPorId = {};

    for (const turno of turnos) {
      turnoPorId[turno.id] = turno;
    }

    // Verificar que todos los turnos existan.
    for (const dia of patronFinal) {
      if (
        dia.tipo !== 'DESCANSO' &&
        !turnoPorId[dia.turnoId]
      ) {
        return res.status(400).json({
          error:
            'Uno o más turnos del patrón no existen o están inactivos'
        });
      }
    }

    const necesitaDescanso = patronFinal.some(
      (dia) => dia.tipo === 'DESCANSO'
    );

    const turnoDescanso = necesitaDescanso
      ? await obtenerOCrearTurnoDescanso()
      : null;

    // CONSTRUIR PROGRAMACIONES

    const filas = [];
    




    for (let i = 0; i < dias; i++) {
      const indicePatron =
        (
          i +
          Number(posicionInicial) -
          1
        ) % patronFinal.length;

      const diaPatron =
        patronFinal[indicePatron];

      const esDescanso =
        diaPatron.tipo === 'DESCANSO';

      const turno = esDescanso
        ? turnoDescanso
        : turnoPorId[diaPatron.turnoId];

      const fecha =
        new Date(
          inicio.getTime() +
          i * 86400000
        );

      filas.push({
        empleadoId,

        turnoId:
          turno.id,

        obraId:
          obraId ?? null,

        fecha,

        tipoProgramacion:
          diaPatron.tipo,

        horaEntrada:
          esDescanso
            ? null
            : turno.horaEntrada,

        horaSalida:
          esDescanso
            ? null
            : turno.horaSalida,

        horasProgramadas:
          esDescanso
            ? 0
            : turno.horasProgramadas,

        estado:
          esDescanso
            ? 'PROGRAMADO'
            : estado,

        observacion:
          diaPatron.observacion ??
          null
      });
    }

    // CREAR SIN DUPLICAR PROGRAMACIONES EXISTENTES

    const resultado =
      await prisma.programacion.createMany({
        data: filas,
        skipDuplicates: true
      });

    return res.status(201).json({
      mensaje:
        'Programación generada correctamente',

      totalDias:
        filas.length,

      creadas:
        resultado.count,

      omitidas:
        filas.length - resultado.count
    });
    



  } catch (error) {
    console.error(
      'ERROR GENERANDO PROGRAMACIONES:',
      error
    );

    return res.status(500).json({
      error:
        'Error al generar las programaciones'
    });
  }
}
