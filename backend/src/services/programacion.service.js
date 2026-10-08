import prisma from "../config/database.js";

function sumarDias(iso, dias) {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function diasEntre(desde, hasta) {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function fechasDeQuincena(desde, hasta) {
  const total = diasEntre(desde, hasta);
  return Array.from({ length: total + 1 }, (_, indice) => sumarDias(desde, indice));
}

function diaDeLaSemana(iso) {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function turnoDelDia(fecha, regla, turnos) {
  if (regla.modo === "DOS_POR_DOS") {
    const fase = ((diasEntre(regla.ancla, fecha) % 4) + 4) % 4;
    return fase < 2 ? turnos.base : null;
  }

  if (regla.modo === "CICLO") {
    const patron = regla.patron.length ? regla.patron : ["DIA", "DIA", "DESCANSO", "DESCANSO"];
    const indice = ((diasEntre(regla.ancla, fecha) % patron.length) + patron.length) % patron.length;
    const tipo = patron[indice];
    if (tipo === "DESCANSO") return null;
    return tipo === "NOCHE" ? turnos.noche : turnos.base;
  }

  const indice = diaDeLaSemana(fecha);
  if (regla.descansoSemana[indice]) return null;
  if (indice === 5 && turnos.sabado) return turnos.sabado;
  return turnos.base;
}

export function armarProgramacion(desde, hasta, regla, turnos) {
  return fechasDeQuincena(desde, hasta).map((fecha) => {
    const turno = turnoDelDia(fecha, regla, turnos);
    if (!turno) {
      return {
        fecha,
        tipoProgramacion: "DESCANSO",
        estado: "PROGRAMADO",
        turnoId: null,
      };
    }
    return {
      fecha,
      tipoProgramacion: "TRABAJO",
      estado: "PROGRAMADO",
      turnoId: turno.id,
    };
  });
}

async function buscarTurno(id, nombre) {
  if (!id) return null;
  const turno = await prisma.turno.findUnique({ where: { id } });
  if (!turno) throw new Error(`No existe el turno de ${nombre}`);
  return turno;
}

export async function guardarProgramacion(empleadoId, desde, hasta, regla) {
  const empleado = await prisma.empleado.findUnique({ where: { id: empleadoId } });
  if (!empleado) throw new Error("No existe el empleado");

  const turnos = {
    base: await buscarTurno(regla.turnoId, "trabajo"),
    sabado: await buscarTurno(regla.turnoSabadoId, "sábado"),
    noche: await buscarTurno(regla.turnoNocheId, "noche"),
  };
  if (!turnos.base) throw new Error("Falta el turno de trabajo");

  const dias = armarProgramacion(desde, hasta, {
    modo: regla.modo ?? "SEMANAL",
    ancla: regla.ancla ?? desde,
    descansoSemana: regla.descansoSemana?.length === 7
      ? regla.descansoSemana
      : [false, false, false, false, false, true, true],
    patron: regla.patron ?? [],
  }, turnos);

  const guardados = [];
  for (const dia of dias) {
    const fecha = new Date(`${dia.fecha}T00:00:00.000Z`);
    const fila = await prisma.programacion.upsert({
      where: { empleadoId_fecha: { empleadoId, fecha } },
      create: {
        fecha,
        tipoProgramacion: dia.tipoProgramacion,
        estado: dia.estado,
        empleadoId,
        turnoId: dia.turnoId,
      },
      update: {
        tipoProgramacion: dia.tipoProgramacion,
        estado: dia.estado,
        turnoId: dia.turnoId,
      },
    });
    guardados.push(fila);
  }

  return guardados;
}