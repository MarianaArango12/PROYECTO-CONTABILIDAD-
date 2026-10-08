import prisma from '../config/database.js';

export async function crearCargo(req, res) {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({
        error: 'El nombre del cargo es obligatorio'
      });
    }

    const cargo = await prisma.cargo.create({
      data: {
        nombre,
        descripcion
      }
    });

    return res.status(201).json(cargo);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un cargo con ese nombre'
      });
    }

    return res.status(500).json({
      error: 'Error al crear el cargo'
    });
  }
}


export async function listarCargos(req, res) {
  try {
    const cargos = await prisma.cargo.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });

    return res.json(cargos);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar los cargos'
    });
  }
}


export async function obtenerCargo(req, res) {
  try {
    const { id } = req.params;

    const cargo = await prisma.cargo.findUnique({
      where: {
        id
      }
    });

    if (!cargo) {
      return res.status(404).json({
        error: 'Cargo no encontrado'
      });
    }

    return res.json(cargo);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener el cargo'
    });
  }
}


export async function actualizarCargo(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const cargo = await prisma.cargo.update({
      where: {
        id
      },
      data: {
        nombre,
        descripcion
      }
    });

    return res.json(cargo);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Cargo no encontrado'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un cargo con ese nombre'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar el cargo'
    });
  }
}


export async function cambiarEstadoCargo(req, res) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        error: 'El campo activo debe ser true o false'
      });
    }

    const cargo = await prisma.cargo.update({
      where: {
        id
      },
      data: {
        activo
      }
    });

    return res.json(cargo);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Cargo no encontrado'
      });
    }

    return res.status(500).json({
      error: 'Error al cambiar el estado del cargo'
    });
  }
}