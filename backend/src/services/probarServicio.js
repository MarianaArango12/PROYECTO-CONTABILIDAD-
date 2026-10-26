// Prueba del servicio con un Prisma FALSO (sin base de datos), quincena sep-2026 de la hoja real
import { liquidarEmpleado } from './liquidarEmpleado.js';
const P = (dia, e, s, tipo = 'TRABAJO') => ({ fecha: new Date(`2026-09-${dia}`), horaEntrada: e, horaSalida: s,
  tipoProgramacion: tipo, estado: 'PROGRAMADO', turno: {} });
const filas = [
  P('16','21:00','05:00'), P('17','21:00','05:00'), P('18','18:00','06:00'), P('19','18:00','06:00'),
  P('20',null,null,'DESCANSO'),
  P('21','06:00','14:00'), P('22','06:00','14:00'), P('23','06:00','14:00'), P('24','06:00','14:00'),
  P('25',null,null,'DESCANSO'),
  P('26','18:00','06:00'), P('27','18:00','06:00'),
  P('28','21:00','05:00'), P('29','21:00','05:00'), P('30','21:00','05:00'),
];
const prisma = {
  empleado: { findUnique: async () => ({ salarioBase: 1750905 }) },
  programacion: { findMany: async () => filas },
  novedad: { findMany: async () => [] },
};
liquidarEmpleado(prisma, 'x', new Date('2026-09-16'), new Date('2026-09-30'))
  .then((r) => console.log('Total:', r.total, '(esperado 1718704) | advertencias:', r.advertencias));