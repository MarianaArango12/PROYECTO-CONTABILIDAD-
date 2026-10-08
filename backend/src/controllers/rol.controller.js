import prisma from '../config/database.js';

export async function listarRoles(req, res) {
  try {
    const roles = await prisma.rol.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });

    return res.json(roles);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar roles'
    });
  }
}

export async function obtenerRol(req, res) {
  try {
    const { id } = req.params;

    const rol = await prisma.rol.findUnique({
      where: { id }
    });

    if (!rol) {
      return res.status(404).json({
        error: 'Rol no encontrado'
      });
    }

    return res.json(rol);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener el rol'
    });
  }
}