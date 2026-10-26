import prisma from "../config/database.js";
import { PARAMETROS_LABORALES } from "../config/parametrosLaborales.js";

function diaUtc(valor, finDelDia) {
  const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
  return new Date(`${texto}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function rangoDelPeriodo(desde, hasta) {
  return { gte: diaUtc(desde, false), lte: diaUtc(hasta, true) };
}

// CAMBIO 1: festivos con fecha completa (los que se pasan al lunes no se pueden escribir como mes-día).
// Verificar contra el calendario oficial y agregar los de 2027 cuando corresponda.
const FESTIVOS = [
  "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
  "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
  "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
  "2026-11-16", "2026-12-08", "2026-12-25",
];

function fechaUtc(valor) {
  const iso = String(valor).slice(0, 10);
  return new Date(`${iso}T00:00:00Z`);
}

function textoFecha(valor) {
  const fecha = valor instanceof Date ? valor : fechaUtc(valor);
  const año = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

export function esFestivo(valor) {
  return FESTIVOS.includes(textoFecha(valor));
}

export function esDomingo(valor) {
  return fechaUtc(valor).getUTCDay() === 0;
}

export function convertirHoraAMinutos(hora) {
  if (!hora) return null;
  const [h, m] = String(hora).split(":");
  const horas = Number(h);
  const minutos = Number(m);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return null;
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export function calcularDuracionEntreHoras(entrada, salida) {
  const inicio = convertirHoraAMinutos(entrada);
  const finOriginal = convertirHoraAMinutos(salida);
  if (inicio === null || finOriginal === null) return 0;
  let fin = finOriginal;
  if (fin <= inicio) fin += 24 * 60;
  return (fin - inicio) / 60;
}

function esNocturna(minutos) {
  const hora = Math.floor(minutos / 60);
  return hora < 6 || hora >= 19;
}

export function obtenerSegmentosProgramacion(programacion) {
  const entrada = programacion.horaEntrada ?? programacion.turno?.horaEntrada ?? null;
  const salida = programacion.horaSalida ?? programacion.turno?.horaSalida ?? null;
  const inicio = convertirHoraAMinutos(entrada);
  const finOriginal = convertirHoraAMinutos(salida);
  if (inicio === null || finOriginal === null) return [];
  let fin = finOriginal;
  if (fin <= inicio) fin += 24 * 60;
  const fecha = textoFecha(programacion.fecha);
  const bloques = [];
  for (let minuto = inicio; minuto < fin; ) {
    const corte = Math.min(minuto + 30, fin);
    const dia = Math.floor(minuto / (24 * 60));
    const fechaBloque = fechaUtc(fecha);
    fechaBloque.setUTCDate(fechaBloque.getUTCDate() + dia);
    const iso = textoFecha(fechaBloque);
    bloques.push({
      horas: (corte - minuto) / 60,
      nocturna: esNocturna(minuto % (24 * 60)),
      domingo: esDomingo(iso),
      festivo: esFestivo(iso),
    });
    minuto = corte;
  }
  return bloques;
}

export function clasificarHorasPorJornada(segmentos) {
  return segmentos.reduce(
    (total, segmento) => {
      if (segmento.nocturna) total.nocturnas += segmento.horas;
      else total.diurnas += segmento.horas;
      return total;
    },
    { diurnas: 0, nocturnas: 0 },
  );
}

function aprobada(novedad) {
  return !novedad.estado || novedad.estado === "APROBADA";
}

export function tieneIncapacidad(fecha, novedades) {
  const dia = textoFecha(fecha);
  return novedades.some(
    (novedad) => aprobada(novedad) && novedad.tipo === "INCAPACIDAD" && textoFecha(novedad.fecha) === dia,
  );
}

export function calcularIncapacidades(novedades, salarioMensual) {
  const valorDia = salarioMensual / 30;
  const fechas = novedades
    .filter((novedad) => aprobada(novedad) && novedad.tipo === "INCAPACIDAD")
    .map((novedad) => textoFecha(novedad.fecha))
    .sort();
  if (!Number.isFinite(salarioMensual) || salarioMensual <= 0 || fechas.length === 0) {
    return { cantidadDias: 0, valorDia, valorTotal: 0, detalle: [] };
  }
  const dias1a90 = PARAMETROS_LABORALES.incapacidad?.dias1a90 ?? 2 / 3;
  const dias91a180 = PARAMETROS_LABORALES.incapacidad?.dias91a180 ?? 0.5;
  const detalle = [];
  let dia = 0;
  let anterior = null;
  for (const fecha of fechas) {
    const sigue = anterior !== null && Math.round((fechaUtc(fecha) - fechaUtc(anterior)) / 86_400_000) === 1;
    dia = sigue ? dia + 1 : 1;
    const porcentaje = dia <= 90 ? dias1a90 : dia <= 180 ? dias91a180 : 0;
    detalle.push({ fecha, dia, porcentaje, valor: valorDia * porcentaje });
    anterior = fecha;
  }
  return {
    cantidadDias: detalle.length,
    valorDia,
    valorTotal: detalle.reduce((total, item) => total + item.valor, 0),
    detalle,
  };
}

export function analizarProgramaciones(programaciones, segundo = [], tercero) {
  const novedades = Array.isArray(tercero) ? tercero : Array.isArray(segundo) ? segundo : [];
  const tope = PARAMETROS_LABORALES.horasOrdinariasQuincena ?? 91;
  const horasDescanso = PARAMETROS_LABORALES.horasDescanso ?? 7;
  let acumuladas = 0;
  let totalHorasTrabajadas = 0;
  let totalHorasDescansoRemunerado = 0;
  let ordinarias = 0;
  let extraDiurnas = 0;
  let extraNocturnas = 0;
  let extraDiurnasFestivas = 0;
  let extraNocturnasFestivas = 0;
  let recargoNocturno = 0;
  let recargoFestivo = 0;
  let recargoNocturnoFestivo = 0;
  const detalle = [];

  for (const programacion of programaciones) {
    const fecha = textoFecha(programacion.fecha);
    if (programacion.tipoProgramacion === "DESCANSO") {
      totalHorasDescansoRemunerado += horasDescanso;
      detalle.push({ fecha, tipoProgramacion: "DESCANSO", horasTrabajadas: 0, incapacidad: false });
      continue;
    }
    if (tieneIncapacidad(fecha, novedades)) {
      detalle.push({ fecha, tipoProgramacion: "TRABAJO", horasTrabajadas: 0, incapacidad: true });
      continue;
    }
    let trabajadas = 0;
    for (const bloque of obtenerSegmentosProgramacion({ ...programacion, fecha })) {
      const descansoObligatorio = bloque.domingo || bloque.festivo;
      const esExtra = acumuladas >= tope;
      trabajadas += bloque.horas;
      if (!esExtra) {
        ordinarias += bloque.horas;
        acumuladas += bloque.horas;
        // CAMBIO 2: los recargos solo se causan en las horas ORDINARIAS (las extras se pagan completas).
        if (descansoObligatorio && bloque.nocturna) recargoNocturnoFestivo += bloque.horas;
        else if (descansoObligatorio) recargoFestivo += bloque.horas;
        else if (bloque.nocturna) recargoNocturno += bloque.horas;
      // CAMBIO 3: las extras en domingo cuentan como festivas (antes solo se miraba bloque.festivo).
      } else if (descansoObligatorio && bloque.nocturna) extraNocturnasFestivas += bloque.horas;
      else if (descansoObligatorio) extraDiurnasFestivas += bloque.horas;
      else if (bloque.nocturna) extraNocturnas += bloque.horas;
      else extraDiurnas += bloque.horas;
    }
    totalHorasTrabajadas += trabajadas;
    detalle.push({ fecha, tipoProgramacion: "TRABAJO", horasTrabajadas: trabajadas, incapacidad: false });
  }

  return {
    totalHorasTrabajadas,
    totalHorasDescansoRemunerado,
    horasOrdinarias: ordinarias,
    horasExtraDiurnas: extraDiurnas,
    horasExtraNocturnas: extraNocturnas,
    horasExtraDiurnasFestivas: extraDiurnasFestivas,
    horasExtraNocturnasFestivas: extraNocturnasFestivas,
    horasExtraTotales: extraDiurnas + extraNocturnas + extraDiurnasFestivas + extraNocturnasFestivas,
    recargoNocturno,
    recargoFestivo,
    recargoNocturnoFestivo,
    detalle,
  };
}

export function calcularHorasExtra(analisis, valorHora) {
  const extra = PARAMETROS_LABORALES.horasExtra ?? {
    diurna: 0.25,
    nocturna: 0.75,
    festivaDiurna: 1,
    festivaNocturna: 1.5,
  };
  const horas = analisis.horasExtraTotales ?? 0;
  const valor =
    valorHora *
    ((analisis.horasExtraDiurnas ?? 0) * (1 + extra.diurna) +
      (analisis.horasExtraNocturnas ?? 0) * (1 + extra.nocturna) +
      (analisis.horasExtraDiurnasFestivas ?? 0) * (1 + (extra.festivaDiurna ?? extra.dominicalDiurna ?? 1)) +
      (analisis.horasExtraNocturnasFestivas ?? 0) * (1 + (extra.festivaNocturna ?? extra.dominicalNocturna ?? 1.5)));
  return { horas, valor: Math.round(valor) };
}

export function calcularRecargos(novedades, valorHora) {
  let totalHorasNocturnas = 0;
  let totalHorasDominicales = 0;
  let totalHorasFestivas = 0;

  for (const novedad of novedades) {
    if (!aprobada(novedad)) continue;
    const cantidad = Number(novedad.cantidad) || 0;
    if (novedad.tipo === "NOCTURNO") totalHorasNocturnas += cantidad;
    if (novedad.tipo === "DOMINICAL") totalHorasDominicales += cantidad;
    if (novedad.tipo === "FESTIVO") totalHorasFestivas += cantidad;
  }

  const valorNocturno = totalHorasNocturnas * valorHora * PARAMETROS_LABORALES.recargos.nocturno;
  const valorDominical = totalHorasDominicales * valorHora * PARAMETROS_LABORALES.recargos.dominical;
  const valorFestivo = totalHorasFestivas * valorHora * PARAMETROS_LABORALES.recargos.festivo;
  const valorTotal = valorNocturno + valorDominical + valorFestivo;

  return {
    totalHorasNocturnas,
    totalHorasDominicales,
    totalHorasFestivas,
    valorHoraOrdinaria: valorHora,
    valorNocturno,
    valorDominical,
    valorFestivo,
    valorTotal,
  };
}

export async function obtenerNovedadesAprobadas(empleadoId, periodoInicio, periodoFin) {
  return prisma.novedad.findMany({
    where: {
      empleadoId,
      estado: "APROBADA",
      fecha: rangoDelPeriodo(periodoInicio, periodoFin),
    },
    orderBy: { fecha: "asc" },
  });
}

export async function obtenerProgramacionesCumplidas(empleadoId, periodoInicio, periodoFin) {
  return prisma.programacion.findMany({
    where: {
      empleadoId,
      fecha: rangoDelPeriodo(periodoInicio, periodoFin),
      OR: [
        { estado: "CUMPLIDO", tipoProgramacion: "TRABAJO" },
        { estado: "PROGRAMADO", tipoProgramacion: "DESCANSO" },
      ],
    },
    include: {
      turno: {
        select: {
          id: true,
          nombre: true,
          horaEntrada: true,
          horaSalida: true,
          horasProgramadas: true,
          jornada: true,
          tipo: true,
          activo: true,
        },
      },
    },
    orderBy: { fecha: "asc" },
  });
}