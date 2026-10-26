import prisma from '../config/database.js';

/**
 * Generación MASIVA de programaciones por ciclo.
 *
 * Una sola llamada crea la quincena/mes de muchos empleados.
 * - ciclo: lista de turnoId (uuid) o 'DESC'. Ej: 4x2 => [T,T,T,T,'DESC','DESC']
 *          También acepta el formato del controller actual: [{tipo:'TRABAJO',turnoId},{tipo:'DESCANSO'}]
 * - posicionInicial (1..n): posición del ciclo que cae en `fechaAncla`.
 * - fechaAncla: permite continuar el ciclo entre quincenas sin recalcular. Por defecto = desde.
 * - escalonar: si true y el empleado no trae posicionInicial, reparte las posiciones
 *              para que no descansen todos el mismo día.
 * - vistaPrevia: calcula todo pero NO guarda.
 * - reemplazar: borra primero las programaciones PROGRAMADO del rango (nunca CUMPLIDO/CAMBIO/AUSENCIA/CANCELADO).
 */

const DIA_MS = 86_400_000;
const MAX_DIAS = 62;
const MAX_EMPLEADOS = 1000;
const TROZO = 2000;
const ESTADOS = ['PROGRAMADO', 'CUMPLIDO', 'CAMBIO', 'AUSENCIA', 'CANCELADO'];
const NOVEDADES_QUE_AUSENTAN = ['INCAPACIDAD', 'AUSENCIA', 'PERMISO'];

export class ErrorValidacion extends Error {}

const aUTC = (iso) => new Date(`${iso}T00:00:00.000Z`);
const aISO = (d) => d.toISOString().slice(0, 10);
const esISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(aUTC(s).getTime());
const diasEntre = (a, b) => Math.round((aUTC(b) - aUTC(a)) / DIA_MS);
const mod = (n, m) => ((n % m) + m) % m;

function normalizarCiclo(ciclo) {
  if (!Array.isArray(ciclo) || ciclo.length === 0) return null;
  const salida = [];
  for (const item of ciclo) {
    if (item === 'DESC' || item === 'DESCANSO' || item?.tipo === 'DESCANSO') {
      salida.push({ descanso: true });
    } else {
      const turnoId = typeof item === 'string' ? item : item?.turnoId;
      if (!turnoId) return null;
      salida.push({ turnoId });
    }
  }
  return salida;
}

async function obtenerTurnoDescanso() {
  const existente = await prisma.turno.findFirst({
    where: { nombre: { equals: 'Descanso', mode: 'insensitive' } },
  });
  if (existente) return existente;
  return prisma.turno.create({
    data: {
      nombre: 'Descanso',
      descripcion: 'Día de descanso. No genera horas.',
      horasProgramadas: 0,
      jornada: 0,
      tipo: 'DIA',
      activo: true,
    },
  });
}

export async function generarMasivo({
  desde,
  hasta,
  asignaciones,
  ciclo: cicloBase,
  obraId: obraIdBase,
  estado = 'PROGRAMADO',
  reemplazar = false,
  vistaPrevia = false,
  escalonar = false,
}) {
  // ---------- validaciones generales ----------
  if (!esISO(desde) || !esISO(hasta)) throw new ErrorValidacion('desde y hasta deben tener formato AAAA-MM-DD');
  const dias = diasEntre(desde, hasta) + 1;
  if (dias < 1 || dias > MAX_DIAS) throw new ErrorValidacion(`El rango debe ser de 1 a ${MAX_DIAS} días`);
  if (!Array.isArray(asignaciones) || asignaciones.length === 0) throw new ErrorValidacion('Debe enviar al menos un empleado en asignaciones');
  if (asignaciones.length > MAX_EMPLEADOS) throw new ErrorValidacion(`Máximo ${MAX_EMPLEADOS} empleados por solicitud`);
  if (!ESTADOS.includes(estado)) throw new ErrorValidacion('Estado de programación no válido');

  const inicio = aUTC(desde);
  const fin = aUTC(hasta);

  // ---------- carga de datos (pocas consultas, no una por día) ----------
  const ids = [...new Set(asignaciones.map((a) => a.empleadoId).filter(Boolean))];
  const baseNorm = cicloBase ? normalizarCiclo(cicloBase) : null;
  const ciclos = asignaciones.map((a) => (a.ciclo ? normalizarCiclo(a.ciclo) : baseNorm));

  const turnoIds = new Set();
  ciclos.forEach((c) => c?.forEach((x) => x.turnoId && turnoIds.add(x.turnoId)));

  const [empleados, turnos, existentes, novedades] = await Promise.all([
    prisma.empleado.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombres: true, apellidos: true, documento: true, activo: true },
    }),
    prisma.turno.findMany({ where: { id: { in: [...turnoIds] } } }),
    prisma.programacion.findMany({
      where: { empleadoId: { in: ids }, fecha: { gte: inicio, lte: fin } },
      select: { empleadoId: true, fecha: true, estado: true },
    }),
    prisma.novedad.findMany({
      where: {
        empleadoId: { in: ids },
        estado: 'APROBADA',
        tipo: { in: NOVEDADES_QUE_AUSENTAN },
        fecha: { gte: inicio, lte: fin },
      },
      select: { empleadoId: true, fecha: true },
    }),
  ]);

  const empPorId = new Map(empleados.map((e) => [e.id, e]));
  const turnoPorId = new Map(turnos.map((t) => [t.id, t]));
  const conNovedad = new Set(novedades.map((n) => `${n.empleadoId}|${aISO(n.fecha)}`));

  // celdas que NO se tocan: todo lo existente, salvo PROGRAMADO cuando se pide reemplazar
  const ocupado = new Set(
    existentes
      .filter((e) => !reemplazar || e.estado !== 'PROGRAMADO')
      .map((e) => `${e.empleadoId}|${aISO(e.fecha)}`)
  );
  const aReemplazar = reemplazar ? existentes.filter((e) => e.estado === 'PROGRAMADO').length : 0;

  const necesitaDescanso = ciclos.some((c) => c?.some((x) => x.descanso));
  const turnoDescanso = necesitaDescanso && !vistaPrevia ? await obtenerTurnoDescanso() : null;

  // ---------- construcción ----------
  const filas = [];
  const resumen = [];
  const errores = [];
  const vistos = new Set();
  let omitidas = 0;

  asignaciones.forEach((a, idx) => {
    const falla = (error) => errores.push({ empleadoId: a.empleadoId ?? null, error });
    const emp = empPorId.get(a.empleadoId);
    const ciclo = ciclos[idx];

    if (!a.empleadoId || !emp) return falla('Empleado no encontrado');
    if (vistos.has(a.empleadoId)) return falla('Empleado repetido en la solicitud');
    vistos.add(a.empleadoId);
    if (!emp.activo) return falla('Empleado inactivo');
    if (!ciclo) return falla('Ciclo vacío o inválido');
    if (ciclo.some((x) => x.turnoId && !turnoPorId.get(x.turnoId)?.activo)) return falla('Turno inexistente o inactivo');

    const ancla = a.fechaAncla ?? desde;
    if (!esISO(ancla)) return falla('fechaAncla inválida');

    const pos = Number.isInteger(a.posicionInicial)
      ? a.posicionInicial
      : escalonar ? (idx % ciclo.length) + 1 : 1;
    const base = diasEntre(ancla, desde) + pos - 1;
    const obraId = a.obraId ?? obraIdBase ?? null;

    const r = {
      empleadoId: emp.id,
      empleado: `${emp.apellidos} ${emp.nombres}`.trim(),
      documento: emp.documento,
      diasTrabajo: 0, diasDescanso: 0, horas: 0, omitidas: 0, conNovedad: 0,
    };

    for (let i = 0; i < dias; i++) {
      const fecha = new Date(inicio.getTime() + i * DIA_MS);
      const clave = `${emp.id}|${aISO(fecha)}`;
      if (ocupado.has(clave)) { r.omitidas++; omitidas++; continue; }

      const item = ciclo[mod(base + i, ciclo.length)];
      if (item.descanso) {
        r.diasDescanso++;
        filas.push({
          empleadoId: emp.id, turnoId: turnoDescanso?.id ?? null, obraId, fecha,
          tipoProgramacion: 'DESCANSO', horaEntrada: null, horaSalida: null,
          horasProgramadas: 0, estado: 'PROGRAMADO',
        });
      } else {
        const t = turnoPorId.get(item.turnoId);
        r.diasTrabajo++;
        r.horas += Number(t.horasProgramadas ?? 0);
        if (conNovedad.has(clave)) r.conNovedad++;
        filas.push({
          empleadoId: emp.id, turnoId: t.id, obraId, fecha,
          tipoProgramacion: 'TRABAJO', horaEntrada: t.horaEntrada, horaSalida: t.horaSalida,
          horasProgramadas: t.horasProgramadas ?? 0, estado,
        });
      }
    }
    resumen.push(r);
  });

  const totales = {
    empleados: resumen.length,
    filas: filas.length,
    omitidas,
    aReemplazar,
    conNovedadAprobada: resumen.reduce((s, r) => s + r.conNovedad, 0),
    errores: errores.length,
  };

  if (vistaPrevia) return { vistaPrevia: true, totales, resumen, errores };

  // ---------- guardado en bloque, atómico ----------
  const operaciones = [];
  if (reemplazar && resumen.length) {
    operaciones.push(
      prisma.programacion.deleteMany({
        where: {
          empleadoId: { in: resumen.map((r) => r.empleadoId) },
          fecha: { gte: inicio, lte: fin },
          estado: 'PROGRAMADO',
        },
      })
    );
  }
  for (let i = 0; i < filas.length; i += TROZO) {
    operaciones.push(prisma.programacion.createMany({ data: filas.slice(i, i + TROZO), skipDuplicates: true }));
  }
  const resultados = operaciones.length ? await prisma.$transaction(operaciones) : [];
  const creadas = resultados.slice(reemplazar && resumen.length ? 1 : 0).reduce((s, x) => s + x.count, 0);

  return { vistaPrevia: false, totales: { ...totales, creadas }, resumen, errores };
}

export async function generarMasivoHandler(req, res) {
  try {
    const resultado = await generarMasivo(req.body ?? {});
    return res.status(resultado.vistaPrevia ? 200 : 201).json(resultado);
  } catch (error) {
    if (error instanceof ErrorValidacion) return res.status(400).json({ error: error.message });
    console.error('ERROR EN GENERACIÓN MASIVA:', error);
    return res.status(500).json({ error: 'Error al generar las programaciones' });
  }
}