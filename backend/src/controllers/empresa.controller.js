import prisma from '../config/database.js';

export async function crearEmpresa(req, res) {
  try {
    const { nit, razonSocial, direccion, telefono, email } = req.body;

    if (!nit || !razonSocial) {
      return res.status(400).json({
        error: 'nit y razonSocial son obligatorios'
      });
    }

    const empresa = await prisma.empresa.create({
      data: {
        nit,
        razonSocial,
        direccion,
        telefono,
        email
      }
    });

    return res.status(201).json(empresa);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe una empresa con ese NIT'
      });
    }

    return res.status(500).json({
      error: 'Error al crear la empresa'
    });
  }
}

export async function listarEmpresas(req, res) {
  try {
    const empresas = await prisma.empresa.findMany({
      where: {
        activo: true
      }
    });

    return res.json(empresas);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar empresas'
    });
  }
}

export async function obtenerEmpresa(req, res) {
  try {
    const { id } = req.params;

    const empresa = await prisma.empresa.findUnique({
      where: { id }
    });

    if (!empresa) {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

    return res.json(empresa);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener la empresa'
    });
  }
}

export async function actualizarEmpresa(req, res) {
  try {
    const { id } = req.params;

    const {
      razonSocial,
      direccion,
      telefono,
      email
    } = req.body;

    const empresa = await prisma.empresa.update({
      where: { id },
      data: {
        razonSocial,
        direccion,
        telefono,
        email
      }
    });

    return res.json(empresa);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar la empresa'
    });
  }
}

export async function eliminarEmpresa(req, res) {
  try {
    const { id } = req.params;

    await prisma.empresa.update({
      where: { id },
      data: {
        activo: false
      }
    });

    return res.status(204).send();

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

    return res.status(500).json({
      error: 'Error al eliminar la empresa'
    });
  }
}