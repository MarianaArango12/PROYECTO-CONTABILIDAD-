import prisma from '../config/database.js';

export async function crearEmpleado(req, res) {
  try {
    const {
      nombres,
      apellidos,
      documento,
      cargoId,
      salarioBase,
      fechaIngreso
    } = req.body;

    const empresaId = req.usuario.empresaId;

    if (
      !nombres ||
      !apellidos ||
      !documento ||
      !cargoId ||
      salarioBase === undefined ||
      !fechaIngreso
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    // ============================
    // VALIDAR EMPRESA DEL USUARIO
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
    // VALIDAR DOCUMENTO
    // ============================

    const documentoLimpio = String(documento).trim();

    if (!/^\d{1,10}$/.test(documentoLimpio)) {
      return res.status(400).json({
        error:
          'El documento debe contener únicamente números y tener máximo 10 dígitos'
      });
    }

    // ============================
    // VALIDAR CARGO
    // ============================

    const cargoExiste = await prisma.cargo.findUnique({
      where: {
        id: cargoId
      }
    });

    if (!cargoExiste) {
      return res.status(400).json({
        error: 'El cargo indicado no existe'
      });
    }

    const empleado = await prisma.empleado.create({
      data: {
        nombres,
        apellidos,
        documento: documentoLimpio,

        // Conservamos temporalmente el campo antiguo
        cargo: cargoExiste.nombre,

        // Nuevo catálogo de cargos
        cargoId,

        salarioBase,
        fechaIngreso: new Date(fechaIngreso),

        // La empresa sale del token, NO del formulario
        empresaId
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documento: true,
        salarioBase: true,
        fechaIngreso: true,
        fechaSalida: true,
        motivoSalida: true,
        observacionSalida: true,
        activo: true,
        cargoId: true,

        cargoCatalogo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            activo: true
          }
        },

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        }
      }
    });

    return res.status(201).json(empleado);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un empleado con ese documento'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'La empresa o el cargo indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al crear el empleado'
    });
  }
}


export async function listarEmpleados(req, res) {
  try {
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const empleados = await prisma.empleado.findMany({
      where: {
        activo: true,
        empresaId
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documento: true,
        salarioBase: true,
        fechaIngreso: true,
        fechaSalida: true,
        motivoSalida: true,
        observacionSalida: true,
        activo: true,
        cargoId: true,

        cargoCatalogo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            activo: true
          }
        },

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        }
      },

      orderBy: {
        apellidos: 'asc'
      }
    });

    return res.json(empleados);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar empleados'
    });
  }
}


export async function obtenerEmpleado(req, res) {
  try {
    const { id } = req.params;
    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    const empleado = await prisma.empleado.findFirst({
      where: {
        id,
        empresaId
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documento: true,
        salarioBase: true,
        fechaIngreso: true,
        fechaSalida: true,
        motivoSalida: true,
        observacionSalida: true,
        activo: true,
        cargoId: true,

        cargoCatalogo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            activo: true
          }
        },

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        }
      }
    });

    if (!empleado) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    return res.json(empleado);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener el empleado'
    });
  }
}


export async function actualizarEmpleado(req, res) {
  try {
    const { id } = req.params;

    const {
      nombres,
      apellidos,
      documento,
      cargoId,
      salarioBase,
      fechaIngreso
    } = req.body;

    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    if (!cargoId) {
      return res.status(400).json({
        error: 'El cargoId es obligatorio'
      });
    }

    // ============================
    // VALIDAR QUE EL EMPLEADO
    // PERTENEZCA A LA EMPRESA
    // ============================

    const empleadoExiste = await prisma.empleado.findFirst({
      where: {
        id,
        empresaId
      }
    });

    if (!empleadoExiste) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    // ============================
    // VALIDAR DOCUMENTO
    // ============================

    const documentoLimpio = String(documento || '').trim();

    if (!/^\d{1,10}$/.test(documentoLimpio)) {
      return res.status(400).json({
        error:
          'El documento debe contener únicamente números y tener máximo 10 dígitos'
      });
    }

    // ============================
    // VALIDAR CARGO
    // ============================

    const cargoExiste = await prisma.cargo.findUnique({
      where: {
        id: cargoId
      }
    });

    if (!cargoExiste) {
      return res.status(400).json({
        error: 'El cargo indicado no existe'
      });
    }

    // ============================
    // VALIDAR FECHA DE INGRESO
    // ============================

    if (fechaIngreso) {
      const nuevaFechaIngreso = new Date(fechaIngreso);

      if (Number.isNaN(nuevaFechaIngreso.getTime())) {
        return res.status(400).json({
          error: 'La fecha de ingreso no es válida'
        });
      }

      if (
        empleadoExiste.fechaSalida &&
        nuevaFechaIngreso > empleadoExiste.fechaSalida
      ) {
        return res.status(400).json({
          error:
            'La fecha de ingreso no puede ser posterior a la fecha de salida'
        });
      }
    }

    const empleado = await prisma.empleado.update({
      where: {
        id
      },

      data: {
        nombres,
        apellidos,
        documento: documentoLimpio,

        // Conservamos temporalmente el campo anterior
        cargo: cargoExiste.nombre,

        // Nuevo catálogo
        cargoId,

        salarioBase,

        fechaIngreso: fechaIngreso
          ? new Date(fechaIngreso)
          : undefined

        // IMPORTANTE:
        // No permitimos modificar empresaId
        // No modificamos fechaSalida desde este endpoint
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documento: true,
        salarioBase: true,
        fechaIngreso: true,
        fechaSalida: true,
        motivoSalida: true,
        observacionSalida: true,
        activo: true,
        cargoId: true,

        cargoCatalogo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            activo: true
          }
        },

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        }
      }
    });

    return res.json(empleado);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un empleado con ese documento'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'El cargo indicado no existe'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar el empleado'
    });
  }
}


/*
========================================================
RETIRAR EMPLEADO
========================================================

No eliminamos al empleado.

Registramos:
- fechaSalida
- motivoSalida
- observacionSalida
- activo = false

El historial del empleado permanece en la base de datos.
*/

export async function cambiarEstadoEmpleado(req, res) {
  try {
    const { id } = req.params;

    const {
      fechaSalida,
      motivoSalida,
      observacionSalida
    } = req.body;

    const empresaId = req.usuario.empresaId;

    if (!empresaId) {
      return res.status(403).json({
        error: 'El usuario no tiene una empresa asociada'
      });
    }

    // ============================
    // VALIDAR DATOS DEL RETIRO
    // ============================

    if (!fechaSalida) {
      return res.status(400).json({
        error: 'La fecha de salida es obligatoria'
      });
    }

    if (!motivoSalida || !String(motivoSalida).trim()) {
      return res.status(400).json({
        error: 'El motivo de salida es obligatorio'
      });
    }

    const fechaSalidaLimpia = new Date(fechaSalida);

    if (Number.isNaN(fechaSalidaLimpia.getTime())) {
      return res.status(400).json({
        error: 'La fecha de salida no es válida'
      });
    }

    // ============================
    // VALIDAR EMPLEADO
    // ============================

    const empleadoExiste = await prisma.empleado.findFirst({
      where: {
        id,
        empresaId
      }
    });

    if (!empleadoExiste) {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    // ============================
    // VALIDAR ESTADO ACTUAL
    // ============================

    if (!empleadoExiste.activo) {
      return res.status(400).json({
        error: 'El empleado ya se encuentra retirado'
      });
    }

    // ============================
    // VALIDAR FECHA DE SALIDA
    // ============================

    const fechaIngreso = new Date(empleadoExiste.fechaIngreso);

    if (fechaSalidaLimpia < fechaIngreso) {
      return res.status(400).json({
        error:
          'La fecha de salida no puede ser anterior a la fecha de ingreso'
      });
    }

    // ============================
    // RETIRAR EMPLEADO
    // ============================

    const empleado = await prisma.empleado.update({
      where: {
        id
      },

      data: {
        fechaSalida: fechaSalidaLimpia,
        motivoSalida: String(motivoSalida).trim(),
        observacionSalida: observacionSalida
          ? String(observacionSalida).trim()
          : null,
        activo: false
      },

      select: {
        id: true,
        nombres: true,
        apellidos: true,
        documento: true,
        salarioBase: true,
        fechaIngreso: true,
        fechaSalida: true,
        motivoSalida: true,
        observacionSalida: true,
        activo: true,
        cargoId: true,

        cargoCatalogo: {
          select: {
            id: true,
            nombre: true,
            descripcion: true,
            activo: true
          }
        },

        empresa: {
          select: {
            id: true,
            nit: true,
            razonSocial: true
          }
        }
      }
    });

    return res.json({
      mensaje: 'Empleado retirado correctamente',
      empleado
    });

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Empleado no encontrado'
      });
    }

    return res.status(500).json({
      error: 'Error al retirar el empleado'
    });
  }
}