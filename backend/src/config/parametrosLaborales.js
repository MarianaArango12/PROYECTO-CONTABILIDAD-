export const PARAMETROS_LABORALES = {

  salarioMinimo: 1750905,

  horasMensuales: 210,

  horasSemanales: 42,

  horasOrdinariasQuincena: 91,

  horasDescanso: 7,

  valorHoraOrdinaria: 8338,

  // ======================================================
  // AUXILIO DE TRANSPORTE
  // ======================================================
  //
  // Regla definida para este proyecto:
  // $124.548 por cada quincena.
  //
  // 1 al 15       = $124.548
  // 16 al fin mes = $124.548
  // Mes completo  = $249.096
  //
  auxilioTransporte: 124548,

  // ======================================================
  // APORTES DEL TRABAJADOR
  // ======================================================

  aportesTrabajador: {

    salud: 0.04,

    pension: 0.04

  },

  // ======================================================
  // RECARGOS
  // ======================================================
 
 
  recargos: {
    nocturno: 0.35,
    dominical: 0.90,
    festivo: 0.90,
    nocturnoFestivo: 0.35
  },

  // ======================================================
  // HORAS EXTRA
  // ======================================================

  horasExtra: {

    diurna: 0.25,

    nocturna: 0.75,

    dominicalDiurna: 1.00,

    dominicalNocturna: 1.50,

    festivaDiurna: 1.00,

    festivaNocturna: 1.50

  },

  // ======================================================
  // DESCANSO REMUNERADO
  // ======================================================

  descansoRemunerado: 1.00,

  // ======================================================
  // INCAPACIDAD
  // ======================================================

  incapacidad: {

    enfermedadGeneral: {

      dias1a90: 2 / 3,

      dias91a180: 0.50

    }

  }

};