import prisma from '../config/database.js';


// =====================
// CREAR NOVEDAD
// =====================

export async function crearNovedad(req, res) {
  try {
    const {
      empleadoId,
      categoria,
      tipo,
      fecha,
      cantidad,
      observacion
    } = req.body;

    const empresaId = req.usuario.empresaId;

    if (!empleadoId || !categoria || !tipo || !fecha) {
      return res.status(400).json({
        error: 'empleadoId, categoria, tipo y fecha son obligatorios'
      });
    }

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    // Verificar que el empleado pertenezca a la empresa
    // del usuario autenticado.
    const empleado = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId
      }
    });

    if (!empleado) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    const novedad = await prisma.novedad.create({
      data: {
        empleadoId,
        categoria,
        tipo,
        fecha: new Date(fecha),
        cantidad: cantidad ?? null,
        observacion: observacion ?? null,
        estado: 'PENDIENTE',
        creadoPorId: req.usuario.id
      },
      include: {
        empleado: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json(novedad);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al crear la novedad'
    });
  }
}


// ============================================================
// LISTAR NOVEDADES
// ============================================================

export async function listarNovedades(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const novedades = await prisma.novedad.findMany({
      where: {
        empleado: {
          empresaId
        }
      },
      include: {
        empleado: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        revisadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        creadoEn: 'desc'
      }
    });

    return res.json(novedades);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar las novedades'
    });
  }
}


// ============================================================
// OBTENER NOVEDAD
// ============================================================

export async function obtenerNovedad(req, res) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const novedad = await prisma.novedad.findFirst({
      where: {
        id,
        empleado: {
          empresaId
        }
      },
      include: {
        empleado: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        revisadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!novedad) {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    return res.json(novedad);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener la novedad'
    });
  }
}


// ============================================================
// APROBAR NOVEDAD
// ============================================================

export async function aprobarNovedad(req, res) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const novedad = await prisma.novedad.findFirst({
      where: {
        id,
        empleado: {
          empresaId
        }
      }
    });

    if (!novedad) {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    if (novedad.estado !== 'PENDIENTE') {
      return res.status(400).json({
        error: 'La novedad ya fue revisada'
      });
    }

    const novedadActualizada = await prisma.novedad.update({
      where: {
        id
      },
      data: {
        estado: 'APROBADA',
        revisadoPorId: req.usuario.id,
        revisadoEn: new Date()
      },
      include: {
        empleado: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        revisadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return res.json(novedadActualizada);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al aprobar la novedad'
    });
  }
}


// ============================================================
// RECHAZAR NOVEDAD
// ============================================================

export async function rechazarNovedad(req, res) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const novedad = await prisma.novedad.findFirst({
      where: {
        id,
        empleado: {
          empresaId
        }
      }
    });

    if (!novedad) {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    if (novedad.estado !== 'PENDIENTE') {
      return res.status(400).json({
        error: 'La novedad ya fue revisada'
      });
    }

    const novedadActualizada = await prisma.novedad.update({
      where: {
        id
      },
      data: {
        estado: 'RECHAZADA',
        revisadoPorId: req.usuario.id,
        revisadoEn: new Date()
      },
      include: {
        empleado: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        revisadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return res.json(novedadActualizada);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Novedad no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al rechazar la novedad'
    });
  }
}

