// =====================================================================
//  liquidarEmpleado.js  -  Une la base de datos (Prisma) con el cálculo
//  Va junto a clasificarTurno.js (p. ej. src/services/nomina/)
//  Ajustado al schema.prisma de ContaPro (Programacion, Novedad, Nomina).
// =====================================================================
import { liquidarQuincena, CONFIG } from './clasificarTurno.js';

// Estados de programación que SÍ se pagan. AUSENCIA y CANCELADO no.  (CONFIRMAR con la empresa)
const ESTADOS_QUE_CUENTAN = ['PROGRAMADO', 'CUMPLIDO', 'CAMBIO'];

// Tipos de Novedad (enum TipoNovedad) -> código de concepto de la tabla de la empresa.
// Las novedades HORA_EXTRA*, RECARGO, DOMINICAL, FESTIVO se IGNORAN: ahora se calculan solas.
const CODIGO_NOVEDAD = { INCAPACIDAD: '012', AUSENCIA: '029', PERMISO: '015' };
const IGNORADAS = ['HORA_EXTRA', 'HORA_EXTRA_NOCTURNA', 'HORA_EXTRA_DOMINICAL',
  'HORA_EXTRA_DOMINICAL_NOCTURNA', 'HORA_EXTRA_FESTIVA', 'HORA_EXTRA_FESTIVA_NOCTURNA',
  'RECARGO', 'DOMINICAL', 'FESTIVO'];

const soloFecha = (d) => d.toISOString().slice(0, 10);               // 'AAAA-MM-DD'
const sumarDia = (iso) => new Date(Date.parse(iso + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
const hhmm = (s) => String(s).trim().padStart(5, '0').slice(0, 5);   // '6:00' -> '06:00'

// Programacion.fecha + horaEntrada/horaSalida (texto 'HH:MM', hora local) -> turno para el cálculo.
// Si el turno no trae horas propias, usa las del Turno asignado.
function armarTurno(p) {
  const entrada = p.horaEntrada ?? p.turno?.horaEntrada;
  const salida = p.horaSalida ?? p.turno?.horaSalida;
  if (!entrada || !salida) return null;
  const dia = soloFecha(p.fecha);
  const e = hhmm(entrada), s = hhmm(salida);
  return { inicio: `${dia}T${e}`, fin: `${s <= e ? sumarDia(dia) : dia}T${s}` };
}

/**
 * desde, hasta: Date (inclusive), p. ej. new Date('2026-09-16'), new Date('2026-09-30')
 * Devuelve la liquidación y una lista de advertencias para revisar.
 */
async function liquidarEmpleado(prisma, empleadoId, desde, hasta, { diasAux = 15 } = {}) {
  const advertencias = [];
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId }, select: { salarioBase: true },
  });
  const salarioBase = Number(empleado.salarioBase);

  const progs = await prisma.programacion.findMany({
    where: { empleadoId, fecha: { gte: desde, lte: hasta } },
    include: { turno: true },
    orderBy: { fecha: 'asc' },
  });

  const turnos = [];
  let descansos = 0;
  for (const p of progs) {
    if (p.estado === 'CANCELADO') continue;
    if (p.tipoProgramacion === 'DESCANSO') { descansos++; continue; }
    if (!ESTADOS_QUE_CUENTAN.includes(p.estado)) continue;
    const t = armarTurno(p);
    if (t) turnos.push(t);
    else advertencias.push(`Sin horario de entrada/salida el ${soloFecha(p.fecha)}`);
  }

  const nov = await prisma.novedad.findMany({
    where: { empleadoId, estado: 'APROBADA', fecha: { gte: desde, lte: hasta } },
  });
  const novedades = [];
  for (const n of nov) {
    if (CODIGO_NOVEDAD[n.tipo]) novedades.push({ tipo: CODIGO_NOVEDAD[n.tipo], horas: Number(n.cantidad ?? 0) });
    else if (IGNORADAS.includes(n.tipo)) advertencias.push(`Novedad ${n.tipo} ignorada (se calcula automático)`);
  }

  // Auxilio de transporte: solo hasta 2 SMLV
  const aplicaAux = salarioBase <= 2 * CONFIG.smlv;
  const res = liquidarQuincena(turnos, { descansos, novedades, salarioBase, diasAux: aplicaAux ? diasAux : 0 });
  return { ...res, advertencias };
}

/** Guarda el resultado en la tabla Nomina (crea o actualiza el periodo). */
async function guardarNomina(prisma, empleadoId, desde, hasta, r) {
  const v = (...cods) => cods.reduce((s, c) => s + (r.detalle[c]?.valor || 0), 0);
  const aux = v('020');
  const ibc = r.total - aux;                          // base de cotización sin auxilio
  const salud = Math.round(ibc * 0.04), pension = Math.round(ibc * 0.04); // CONFIRMAR porcentajes
  const datos = {
    salarioBase: v('001', '009', '010'),
    horasExtra: v('003', '004', '066', '067'),
    recargos: v('062', '063', '064'),
    incapacidad: v('011', '012'),
    auxilioTransporte: aux,
    ingresoBaseCotizacion: ibc,
    salud, pension,
    totalDevengado: r.total,
    totalDeducciones: salud + pension,
    netoPagar: r.total - salud - pension,
    estado: 'CALCULADA',
  };
  return prisma.nomina.upsert({
    where: { empleadoId_periodoInicio_periodoFin: { empleadoId, periodoInicio: desde, periodoFin: hasta } },
    update: datos,
    create: { empleadoId, periodoInicio: desde, periodoFin: hasta, ...datos },
  });
}

export { liquidarEmpleado, guardarNomina, armarTurno };