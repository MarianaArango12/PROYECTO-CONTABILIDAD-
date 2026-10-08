import prisma from '../config/database.js';

function horasDelTurno(entrada, salida) {
  const [eh, em] = String(entrada).slice(0, 5).split(':').map(Number);
  const [sh, sm] = String(salida).slice(0, 5).split(':').map(Number);

  if (![eh, em, sh, sm].every(Number.isFinite)) {
    return null;
  }

  let minutos = (sh * 60 + sm) - (eh * 60 + em);

  if (minutos <= 0) {
    minutos += 24 * 60;
  }

  return minutos / 60;
}

function completarHorario({
  horaEntrada,
  horaSalida,
  horasProgramadas,
  jornada
}) {
  const horas = horaEntrada && horaSalida
    ? horasDelTurno(horaEntrada, horaSalida)
    : null;

  const horasFinales =
    horas !== null
      ? horas
      : Number(horasProgramadas);

  const jornadaFinal =
    jornada !== undefined &&
    jornada !== null &&
    jornada !== ''
      ? Number(jornada)
      : horasFinales;

  return {
    horasProgramadas: horasFinales,
    jornada: jornadaFinal
  };
}

export async function crearTurno(req, res) {
  try {
    const {
      nombre,
      descripcion,
      horaEntrada,
      horaSalida,
      horasProgramadas,
      jornada,
      tipo
    } = req.body;

    if (!nombre || !tipo) {
      return res.status(400).json({
        error: 'El nombre y el tipo del turno son obligatorios'
      });
    }

    const horario = completarHorario({
      horaEntrada,
      horaSalida,
      horasProgramadas,
      jornada
    });

    const turno = await prisma.turno.create({
      data: {
        nombre,
        descripcion,
        horaEntrada,
        horaSalida,
        horasProgramadas: horario.horasProgramadas,
        jornada: horario.jornada,
        tipo
      }
    });

    return res.status(201).json(turno);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un turno con ese nombre'
      });
    }

    return res.status(500).json({
      error: 'Error al crear el turno'
    });
  }
}

export async function listarTurnos(req, res) {
  try {
    const turnos = await prisma.turno.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });

    return res.json(turnos);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al listar los turnos'
    });
  }
}

export async function obtenerTurno(req, res) {
  try {
    const { id } = req.params;

    const turno = await prisma.turno.findUnique({
      where: { id }
    });

    if (!turno) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    return res.json(turno);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al obtener el turno'
    });
  }
}

export async function actualizarTurno(req, res) {
  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      horaEntrada,
      horaSalida,
      horasProgramadas,
      jornada,
      tipo
    } = req.body;

    const horario = completarHorario({
      horaEntrada,
      horaSalida,
      horasProgramadas,
      jornada
    });

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        horaEntrada,
        horaSalida,
        horasProgramadas: horario.horasProgramadas,
        jornada: horario.jornada,
        tipo
      }
    });

    return res.json(turno);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Ya existe un turno con ese nombre'
      });
    }

    return res.status(500).json({
      error: 'Error al actualizar el turno'
    });
  }
}

export async function cambiarEstadoTurno(req, res) {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        error: 'El campo activo debe ser true o false'
      });
    }

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        activo
      }
    });

    return res.json(turno);

  } catch (error) {
    console.error(error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    return res.status(500).json({
      error: 'Error al cambiar el estado del turno'
    });
  }
}