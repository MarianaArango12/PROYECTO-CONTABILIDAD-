// =====================================================================
//  clasificarTurno.js  -  Cálculo de nómina por quincena (ContaPro)
//  Va en el backend, p. ej.: src/services/nomina/clasificarTurno.js
// =====================================================================

import { pathToFileURL } from 'node:url';

// ===== CONFIGURACIÓN (valores de la tabla de la empresa) =====
const CONFIG = {
  smlv: 1750905,
  divisorHoras: 210,          // jornada de 42 h (desde 15-jul-2026)
  inicioNocturno: 19,         // 7:00 p.m. (Ley 2466/2025)
  finNocturno: 6,             // 6:00 a.m.
  // % de cada concepto (según la tabla de la empresa)
  pct: {
    '001': 1.00,  // hora ordinaria
    '062': 0.35,  // recargo nocturno
    '064': 0.90,  // recargo festivo
    '063': 0.35,  // recargo nocturno festivo (se suma al 064)
    '003': 1.25,  // extra diurna
    '004': 1.75,  // extra nocturna
    '066': 2.00,  // extra diurna festiva  (valor de la tabla de la empresa)
    '067': 2.50,  // extra nocturna festiva (valor de la tabla de la empresa)
    '010': 1.00,  // compensatorio
    '011': 1.00,  // incapacidad laboral
    '012': 1.00,  // incapacidad general
    '065': 1.00,  // calamidad
    '017': 0,     // suspensión
    '015': 0,     // permiso no remunerado
    '029': 0,     // ausencia
  },
  // Festivos que NO caen en domingo (AAAA-MM-DD). Los domingos ya se tratan como festivos.
  // Verifícalos contra el calendario oficial y agrega los de 2027 cuando corresponda.
  festivos: [
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
    '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
    '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
    '2026-11-16', '2026-12-08', '2026-12-25',
  ],
};

const valorHora = () => CONFIG.smlv / CONFIG.divisorHoras; // sin redondear

// Se usa la "hora de reloj" en UTC para evitar corrimientos de zona horaria.
const fechaClave = (d) => d.toISOString().slice(0, 10);
const esFestivo = (d) => d.getUTCDay() === 0 || CONFIG.festivos.includes(fechaClave(d));
const esNocturna = (d) => {
  const h = d.getUTCHours();
  return h >= CONFIG.inicioNocturno || h < CONFIG.finNocturno;
};

/**
 * Parte un turno en minutos y los clasifica.
 * inicio y fin: 'AAAA-MM-DDTHH:MM' (si fin <= inicio, se asume que cruza medianoche).
 * Devuelve horas por categoría.
 */
function clasificarTurno(inicioStr, finStr) {
  const inicio = new Date(inicioStr + ':00Z');
  let fin = new Date(finStr + ':00Z');
  if (fin <= inicio) fin = new Date(fin.getTime() + 24 * 3600 * 1000);

  const horas = { DIURNA: 0, NOCTURNA: 0, DIURNA_FESTIVA: 0, NOCTURNA_FESTIVA: 0 };
  for (let t = inicio.getTime(); t < fin.getTime(); t += 60000) {
    const d = new Date(t);
    const clave = (esNocturna(d) ? 'NOCTURNA' : 'DIURNA') + (esFestivo(d) ? '_FESTIVA' : '');
    horas[clave] += 1 / 60;
  }
  return horas;
}

/** Convierte horas clasificadas (todas ORDINARIAS) en conceptos de nómina. */
function valorarOrdinarias(h) {
  const vh = valorHora();
  const c = {
    '001': h.DIURNA + h.NOCTURNA + h.DIURNA_FESTIVA + h.NOCTURNA_FESTIVA,
    '062': h.NOCTURNA,
    '064': h.DIURNA_FESTIVA + h.NOCTURNA_FESTIVA,
    '063': h.NOCTURNA_FESTIVA,
  };
  const detalle = {};
  let total = 0;
  for (const [cod, horas] of Object.entries(c)) {
    const valor = Math.round(horas * vh * CONFIG.pct[cod]); // redondeo SOLO al final
    detalle[cod] = { horas: +horas.toFixed(2), valor };
    total += valor;
  }
  return { detalle, total };
}

// =====================================================================
//  LIQUIDACIÓN DE QUINCENA (según la hoja real de nómina)
//  1) Cuota de horas ORDINARIAS = 91 (fija). Los descansos NO cuentan ni suman ni restan.
//  2) Las primeras horas (cronológicas) hasta completar la cuota son ORDINARIAS (001)
//     y llevan recargos: nocturno (062), festivo (064), nocturno festivo (063).
//  3) De ahí en adelante son HORAS EXTRAS, pagadas completas: 003, 004, 066, 067.
//  4) Cada descanso remunerado paga 7 horas (009). Auxilio de transporte por días (020).
//  5) Sin novedad: lo que falte para 91 se paga como compensatorio (010).
//     Con novedad: no hay compensatorio; cada novedad se paga según su concepto.
//
//  turnos:   [{ inicio: 'AAAA-MM-DDTHH:MM', fin: 'AAAA-MM-DDTHH:MM' }, ...]
//  opts:     { descansos, novedades: [{ tipo: '012', horas: 16 }], diasAux, ... }
// =====================================================================
function liquidarQuincena(turnos, opts = {}) {
  const {
    descansos = 0, salarioBase = CONFIG.smlv, horasOrdinarias = 91, horasDescanso = 7, auxMensual = 249095,
    diasAux = 15, rfIncluyeNocturnoFestivo = true, novedades = [],
  } = opts;

  const cuotaMin = horasOrdinarias * 60;
  const h = { ORD_D: 0, ORD_N: 0, ORD_DF: 0, ORD_NF: 0, EX_D: 0, EX_N: 0, EX_DF: 0, EX_NF: 0 };
  let acum = 0;

  for (const t of [...turnos].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const ini = new Date(t.inicio + ':00Z');
    let fin = new Date(t.fin + ':00Z');
    if (fin <= ini) fin = new Date(fin.getTime() + 86400000);
    for (let ms = ini.getTime(); ms < fin.getTime(); ms += 60000, acum++) {
      const d = new Date(ms);
      const tipo = (acum < cuotaMin ? 'ORD_' : 'EX_') + (esNocturna(d) ? 'N' : 'D') + (esFestivo(d) ? 'F' : '');
      h[tipo] += 1 / 60;
    }
  }

  const ord = h.ORD_D + h.ORD_N + h.ORD_DF + h.ORD_NF;
  const conceptos = {
    '001': ord,
    '062': h.ORD_N,
    '064': rfIncluyeNocturnoFestivo ? h.ORD_DF + h.ORD_NF : h.ORD_DF,
    '063': h.ORD_NF,
    '003': h.EX_D, '004': h.EX_N, '066': h.EX_DF, '067': h.EX_NF,
    '009': horasDescanso * descansos,
    '010': novedades.length === 0 ? Math.max(0, horasOrdinarias - ord) : 0,
  };
  for (const n of novedades) conceptos[n.tipo] = (conceptos[n.tipo] || 0) + n.horas;

  const vh = salarioBase / CONFIG.divisorHoras, detalle = {};
  let total = 0;
  for (const [cod, horas] of Object.entries(conceptos)) {
    const valor = Math.round(horas * vh * CONFIG.pct[cod === '009' ? '001' : cod]);
    detalle[cod] = { horas: +horas.toFixed(2), valor };
    total += valor;
  }
  const aux = Math.round(auxMensual / 30 * diasAux);
  detalle['020'] = { dias: diasAux, valor: aux };
  total += aux;

  return { cuotaOrdinaria: cuotaMin / 60, horasTotales: +(acum / 60).toFixed(2), detalle, total };
}

export { CONFIG, valorHora, clasificarTurno, valorarOrdinarias, liquidarQuincena };

// =====================================================================
//  PRUEBA rápida: node clasificarTurno.js   (se puede borrar este bloque)
// =====================================================================
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('--- Turnos sueltos (esperado: 219281, 127566, 72537) ---');
  const casos = [
    ['Dom 16 ago 17:00 -> 05:00', '2026-08-16T17:00', '2026-08-17T05:00'],
    ['Sáb 29 ago 21:00 -> 05:00', '2026-08-29T21:00', '2026-08-30T05:00'],
    ['Mié 19 ago 13:00 -> 21:00', '2026-08-19T13:00', '2026-08-19T21:00'],
  ];
  for (const [nombre, i, f] of casos) {
    console.log(nombre, '->', valorarOrdinarias(clasificarTurno(i, f)).total);
  }

  console.log('\n--- Quincena sep-2026 de la hoja real (esperado: 1718704) ---');
  const T = (d, a, b, d2) => ({ inicio: `2026-09-${d}T${a}`, fin: `2026-09-${d2 || d}T${b}` });
  const turnos = [
    T('16','21:00','05:00','17'), T('17','21:00','05:00','18'),
    T('18','18:00','06:00','19'), T('19','18:00','06:00','20'),
    T('21','06:00','14:00'), T('22','06:00','14:00'), T('23','06:00','14:00'), T('24','06:00','14:00'),
    T('26','18:00','06:00','27'), T('27','18:00','06:00','28'),
    T('28','21:00','05:00','29'), T('29','21:00','05:00','30'), T('30','21:00','05:00','31'),
  ];
  console.log('Total:', liquidarQuincena(turnos, { descansos: 2 }).total);
}