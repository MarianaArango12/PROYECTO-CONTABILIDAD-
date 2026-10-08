import prisma from '../config/database.js';

export async function listarUsuarios(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        creadoEn: true,
        rol: {
          select: {
            id: true,
            nombre: true
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
        nombre: 'asc'
      }
    });

    return res.json(usuarios);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar usuarios'
    });
  }
}

export async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        creadoEn: true,
        rol: {
          select: {
            id: true,
            nombre: true
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

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    return res.json(usuario);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener el usuario'
    });
  }
}

export async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;

    const {
      nombre,
      email,
      rolId,
      empresaId
    } = req.body;

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        nombre,
        email,
        rolId,
        empresaId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        creadoEn: true,
        rolId: true,
        empresaId: true
      }
    });

    return res.json(usuario);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'El correo ya está registrado'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'El rol o la empresa no existen'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar el usuario'
    });
  }
}

export async function cambiarEstadoUsuario(req, res) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        error: 'El campo activo debe ser true o false'
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        activo
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        rolId: true,
        empresaId: true
      }
    });

    return res.json(usuario);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    return res.status(500).json({
      error: 'Error al cambiar el estado del usuario'
    });
  }
}