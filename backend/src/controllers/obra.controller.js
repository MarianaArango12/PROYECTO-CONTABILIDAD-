import prisma from '../config/database.js';

// ======================================================
// CREAR OBRA
// ======================================================

export async function crearObra(req, res) {
  try {
    const {
      nombre,
      descripcion,
      horasServicio,
      fechaInicio,
      fechaFin,
      turnoId
    } = req.body;

    const empresaId = req.usuario.empresaId;

    // ============================
    // VALIDAR EMPRESA
    // ============================

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const empresaExiste = await prisma.empresa.findUnique({
      where: {
        id: empresaId
      }
    });

    if (!empresaExiste || !empresaExiste.activo) {
      return res.status(403).json({
        error: 'La empresa del usuario no existe o está inactiva'
      });
    }

    // ============================
    // CAMPOS OBLIGATORIOS
    // ============================

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        error: 'El nombre de la obra es obligatorio'
      });
    }

    if (
      horasServicio === undefined ||
      horasServicio === null ||
      horasServicio === ''
    ) {
      return res.status(400).json({
        error: 'Las horas de servicio son obligatorias'
      });
    }

    if (!fechaInicio) {
      return res.status(400).json({
        error: 'La fecha de inicio es obligatoria'
      });
    }

    if (!turnoId) {
      return res.status(400).json({
        error: 'El turno es obligatorio'
      });
    }

    // ============================
    // VALIDAR HORAS
    // ============================

    const horas = Number(horasServicio);

    if (!Number.isFinite(horas) || horas <= 0) {
      return res.status(400).json({
        error: 'Las horas de servicio deben ser mayores que cero'
      });
    }

    // ============================
    // VALIDAR FECHA DE INICIO
    // ============================

    const fechaInicioLimpia = new Date(fechaInicio);

    if (Number.isNaN(fechaInicioLimpia.getTime())) {
      return res.status(400).json({
        error: 'La fecha de inicio no es válida'
      });
    }

    // ============================
    // VALIDAR FECHA DE FIN
    // ============================

    let fechaFinLimpia = null;

    if (fechaFin) {
      fechaFinLimpia = new Date(fechaFin);

      if (Number.isNaN(fechaFinLimpia.getTime())) {
        return res.status(400).json({
          error: 'La fecha de fin no es válida'
        });
      }

      if (fechaFinLimpia < fechaInicioLimpia) {
        return res.status(400).json({
          error:
            'La fecha de fin no puede ser anterior a la fecha de inicio'
        });
      }
    }

    // ============================
    // VALIDAR TURNO
    // ============================

    const turnoExiste = await prisma.turno.findUnique({
      where: {
        id: turnoId
      }
    });

    if (!turnoExiste) {
      return res.status(400).json({
        error: 'El turno indicado no existe'
      });
    }

    if (!turnoExiste.activo) {
      return res.status(400).json({
        error: 'El turno indicado está inactivo'
      });
    }

    // ============================
    // CREAR OBRA
    // ============================

    const obra = await prisma.obra.create({
      data: {
        nombre: String(nombre).trim(),
        descripcion: descripcion
          ? String(descripcion).trim()
          : null,
        horasServicio: horas,
        fechaInicio: fechaInicioLimpia,
        fechaFin: fechaFinLimpia,
        empresaId,
        turnoId
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        horasServicio: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        },

        turno: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            horaEntrada: true,
            horaSalida: true,
            horasProgramadas: true,
            jornada: true,
            tipo: true,
            activo: true
          }
        }
      }
    });

    return res.status(201).json(obra);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'La empresa o el turno indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al crear la obra'
    });
  }
}

// ======================================================
// LISTAR OBRAS
// ======================================================

export async function listarObras(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const obras = await prisma.obra.findMany({
      where: {
        empresaId,
        activo: true
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        horasServicio: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        },

        turno: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            horaEntrada: true,
            horaSalida: true,
            horasProgramadas: true,
            jornada: true,
            tipo: true,
            activo: true
          }
        }
      },

      orderBy: {
        nombre: 'asc'
      }
    });

    return res.json(obras);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar las obras'
    });
  }
}

// ======================================================
// OBTENER OBRA
// ======================================================

export async function obtenerObra(req, res) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        empresaId
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        horasServicio: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        },

        turno: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            horaEntrada: true,
            horaSalida: true,
            horasProgramadas: true,
            jornada: true,
            tipo: true,
            activo: true
          }
        }
      }
    });

    if (!obra) {
      return res.status(404).json({
        error: 'Obra no encontrada'
      });
    }

    return res.json(obra);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener la obra'
    });
  }
}

// ======================================================
// ACTUALIZAR OBRA
// ======================================================

export async function actualizarObra(req, res) {
  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      horasServicio,
      fechaInicio,
      fechaFin,
      turnoId
    } = req.body;

    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    // ============================
    // BUSCAR OBRA
    // ============================

    const obraExiste = await prisma.obra.findFirst({
      where: {
        id,
        empresaId
      }
    });

    if (!obraExiste) {
      return res.status(404).json({
        error: 'Obra no encontrada'
      });
    }

    // ============================
    // VALIDAR CAMPOS
    // ============================

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        error: 'El nombre de la obra es obligatorio'
      });
    }

    if (
      horasServicio === undefined ||
      horasServicio === null ||
      horasServicio === ''
    ) {
      return res.status(400).json({
        error: 'Las horas de servicio son obligatorias'
      });
    }

    if (!fechaInicio) {
      return res.status(400).json({
        error: 'La fecha de inicio es obligatoria'
      });
    }

    if (!turnoId) {
      return res.status(400).json({
        error: 'El turno es obligatorio'
      });
    }

    // ============================
    // VALIDAR HORAS
    // ============================

    const horas = Number(horasServicio);

    if (!Number.isFinite(horas) || horas <= 0) {
      return res.status(400).json({
        error: 'Las horas de servicio deben ser mayores que cero'
      });
    }

    // ============================
    // VALIDAR FECHAS
    // ============================

    const fechaInicioLimpia = new Date(fechaInicio);

    if (Number.isNaN(fechaInicioLimpia.getTime())) {
      return res.status(400).json({
        error: 'La fecha de inicio no es válida'
      });
    }

    let fechaFinLimpia = null;

    if (fechaFin) {
      fechaFinLimpia = new Date(fechaFin);

      if (Number.isNaN(fechaFinLimpia.getTime())) {
        return res.status(400).json({
          error: 'La fecha de fin no es válida'
        });
      }

      if (fechaFinLimpia < fechaInicioLimpia) {
        return res.status(400).json({
          error:
            'La fecha de fin no puede ser anterior a la fecha de inicio'
        });
      }
    }

    // ============================
    // VALIDAR TURNO
    // ============================

    const turnoExiste = await prisma.turno.findUnique({
      where: {
        id: turnoId
      }
    });

    if (!turnoExiste) {
      return res.status(400).json({
        error: 'El turno indicado no existe'
      });
    }

    if (!turnoExiste.activo) {
      return res.status(400).json({
        error: 'El turno indicado está inactivo'
      });
    }

    // ============================
    // ACTUALIZAR
    // ============================

    const obra = await prisma.obra.update({
      where: {
        id
      },

      data: {
        nombre: String(nombre).trim(),
        descripcion: descripcion
          ? String(descripcion).trim()
          : null,
        horasServicio: horas,
        fechaInicio: fechaInicioLimpia,
        fechaFin: fechaFinLimpia,
        turnoId
      },

      select: {
        id: true,
        nombre: true,
        descripcion: true,
        horasServicio: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        },

        turno: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            horaEntrada: true,
            horaSalida: true,
            horasProgramadas: true,
            jornada: true,
            tipo: true,
            activo: true
          }
        }
      }
    });

    return res.json(obra);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Obra no encontrada'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'El turno indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar la obra'
    });
  }
}

// ======================================================
// CAMBIAR ESTADO DE LA OBRA
// ======================================================

export async function cambiarEstadoObra(req, res) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        error: 'El campo activo debe ser true o false'
      });
    }

    const obraExiste = await prisma.obra.findFirst({
      where: {
        id,
        empresaId
      }
    });

    if (!obraExiste) {
      return res.status(404).json({
        error: 'Obra no encontrada'
      });
    }

    const obra = await prisma.obra.update({
      where: {
        id
      },

      data: {
        activo
      }
    });

    return res.json(obra);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Obra no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al cambiar el estado de la obra'
    });
  }
}