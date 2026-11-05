import prisma from "../config/database.js";
import {
  obtenerNovedadesAprobadas,
  obtenerHistorialIncapacidades,
  obtenerHistorialCalamidades,
  obtenerProgramacionesCumplidas,
  analizarProgramaciones,
  calcularIncapacidades,
  calcularDescuentoCalamidad,
} from "../services/nomina.service.js";
import { PARAMETROS_LABORALES } from "../config/parametrosLaborales.js";

function redondearMoneda(valor) {
  return Math.round(Number(valor));
}

function diaUtc(valor, finDelDia) {
  const texto =
    valor instanceof Date
      ? valor.toISOString().slice(0, 10)
      : String(valor).slice(0, 10);

  return new Date(
    `${texto}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`
  );
}

function diasDelPeriodo(inicio, fin) {
  const desde = Date.UTC(
    inicio.getUTCFullYear(),
    inicio.getUTCMonth(),
    inicio.getUTCDate()
  );
  const hasta = Date.UTC(
    fin.getUTCFullYear(),
    fin.getUTCMonth(),
    fin.getUTCDate()
  );

  return Math.round((hasta - desde) / 86400000) + 1;
}

function calcularAuxilio(salario, dias) {
  const minimo = PARAMETROS_LABORALES.salarioMinimo ?? 1750905;

  if (Number(salario) > minimo * 2) return 0;

  const auxilioQuincena =
    PARAMETROS_LABORALES.auxilioQuincena ?? 124548;

  return redondearMoneda(
    (auxilioQuincena / 15) * Math.min(dias, 30)
  );
}

function calcularValoresNomina(analisisProgramaciones, salarioBase) {
  const salario = Number(salarioBase);
  const valorHoraSinRedondear =
    salario / PARAMETROS_LABORALES.horasMensuales;

  const horasExtraSinRedondear =
    analisisProgramaciones.horasExtraDiurnas *
      valorHoraSinRedondear *
      (1 + PARAMETROS_LABORALES.horasExtra.diurna) +
    analisisProgramaciones.horasExtraNocturnas *
      valorHoraSinRedondear *
      (1 + PARAMETROS_LABORALES.horasExtra.nocturna) +
    analisisProgramaciones.horasExtraDiurnasFestivas *
      valorHoraSinRedondear *
      (1 + PARAMETROS_LABORALES.horasExtra.festivaDiurna) +
    analisisProgramaciones.horasExtraNocturnasFestivas *
      valorHoraSinRedondear *
      (1 + PARAMETROS_LABORALES.horasExtra.festivaNocturna);

  const recargosSinRedondear =
    analisisProgramaciones.recargoNocturno *
      valorHoraSinRedondear *
      PARAMETROS_LABORALES.recargos.nocturno +
    analisisProgramaciones.recargoFestivo *
      valorHoraSinRedondear *
      PARAMETROS_LABORALES.recargos.festivo +
    analisisProgramaciones.recargoNocturnoFestivo *
      valorHoraSinRedondear *
      PARAMETROS_LABORALES.recargos.nocturnoFestivo;

  return {
    valorHora: redondearMoneda(valorHoraSinRedondear),
    horasExtra: redondearMoneda(horasExtraSinRedondear),
    recargos: redondearMoneda(recargosSinRedondear),
  };
}

function calcularDetalleConceptos(analisis, salarioBase, totales) {
  const valorHoraExacto =
    Number(salarioBase) / PARAMETROS_LABORALES.horasMensuales;

  const parametrosExtras = PARAMETROS_LABORALES.horasExtra;
  const parametrosRecargos = PARAMETROS_LABORALES.recargos;

  function crearLinea(horas, porcentaje, incluyeBase) {
    const cantidad = Number(horas || 0);
    const factor = Number(porcentaje || 0);
    const tarifaExacta =
      valorHoraExacto * (incluyeBase ? 1 + factor : factor);

    return {
      horas: cantidad,
      porcentaje: redondearMoneda(factor * 100),
      multiplicadorTotal: incluyeBase
        ? redondearMoneda((1 + factor) * 100)
        : null,
      tarifaHora: redondearMoneda(tarifaExacta),
      valorTotal: redondearMoneda(cantidad * tarifaExacta),
    };
  }

  function ajustarTotal(lineas, totalEsperado) {
    if (lineas.length === 0) return;

    const suma = lineas.reduce(
      (acumulado, linea) => acumulado + linea.valorTotal,
      0
    );

    lineas[lineas.length - 1].valorTotal += totalEsperado - suma;
  }

  const extras = [
    {
      clave: "diurna",
      linea: crearLinea(
        analisis.horasExtraDiurnas,
        parametrosExtras.diurna,
        true
      ),
    },
    {
      clave: "nocturna",
      linea: crearLinea(
        analisis.horasExtraNocturnas,
        parametrosExtras.nocturna,
        true
      ),
    },
    {
      clave: "diurnaFestiva",
      linea: crearLinea(
        analisis.horasExtraDiurnasFestivas,
        parametrosExtras.festivaDiurna,
        true
      ),
    },
    {
      clave: "nocturnaFestiva",
      linea: crearLinea(
        analisis.horasExtraNocturnasFestivas,
        parametrosExtras.festivaNocturna,
        true
      ),
    },
  ];

  ajustarTotal(
    extras.map((item) => item.linea),
    totales.horasExtra
  );

  const recargos = [
    {
      clave: "nocturno",
      linea: crearLinea(
        analisis.recargoNocturno,
        parametrosRecargos.nocturno,
        false
      ),
    },
    {
      clave: "festivo",
      linea: crearLinea(
        analisis.recargoFestivo,
        parametrosRecargos.festivo,
        false
      ),
    },
    {
      clave: "nocturnoFestivo",
      linea: crearLinea(
        analisis.recargoNocturnoFestivo,
        parametrosRecargos.nocturnoFestivo,
        false
      ),
    },
  ];

  ajustarTotal(
    recargos.map((item) => item.linea),
    totales.recargos
  );

  const detalleHorasExtra = {
    cantidadHoras: Number(analisis.horasExtraTotales || 0),
    horasDiurnas: Number(analisis.horasExtraDiurnas || 0),
    horasNocturnas: Number(analisis.horasExtraNocturnas || 0),
    horasDiurnasFestivas: Number(
      analisis.horasExtraDiurnasFestivas || 0
    ),
    horasNocturnasFestivas: Number(
      analisis.horasExtraNocturnasFestivas || 0
    ),
    valorTotal: totales.horasExtra,
  };

  for (const item of extras) {
    detalleHorasExtra[item.clave] = item.linea;
  }

  const detalleRecargos = {
    totalHorasNocturnas: Number(analisis.recargoNocturno || 0),
    totalHorasFestivas: Number(analisis.recargoFestivo || 0),
    totalHorasNocturnasFestivas: Number(
      analisis.recargoNocturnoFestivo || 0
    ),
    valorNocturno: recargos[0].linea.valorTotal,
    valorFestivo: recargos[1].linea.valorTotal,
    valorNocturnoFestivo: recargos[2].linea.valorTotal,
    valorTotal: totales.recargos,
  };

  for (const item of recargos) {
    detalleRecargos[item.clave] = item.linea;
  }

  return { detalleHorasExtra, detalleRecargos };
}

function calcularSalarioCausado(
  salarioBase,
  incapacidad,
  diasPeriodo
) {
  const salario = Number(salarioBase);
  const valorDia = salario / 30;
  const dias = Math.min(Number(diasPeriodo) || 0, 30);
  const diasIncapacidad = Number(incapacidad?.cantidadDias ?? 0);
  const descuentoSalario = valorDia * diasIncapacidad;
  const salarioCausado =
    valorDia * dias -
    descuentoSalario +
    Number(incapacidad?.valorTotal ?? 0);

  return { valorDia, descuentoSalario, salarioCausado, dias };
}

function totalesDeNomina({
  salarioCausado,
  horasExtra,
  recargos,
  bono,
  descuento,
  auxilio,
}) {
  const ibc = redondearMoneda(
    Math.max(0, salarioCausado + horasExtra + recargos)
  );

  const salud = redondearMoneda(
    ibc * PARAMETROS_LABORALES.aportesTrabajador.salud
  );

  const pension = redondearMoneda(
    ibc * PARAMETROS_LABORALES.aportesTrabajador.pension
  );

  const totalDevengado = redondearMoneda(
    salarioCausado + horasExtra + recargos + bono + auxilio
  );

  const totalDeducciones = redondearMoneda(
    salud + pension + descuento
  );

  const netoPagar = redondearMoneda(
    totalDevengado - totalDeducciones
  );

  return {
    ibc,
    salud,
    pension,
    totalDevengado,
    totalDeducciones,
    netoPagar,
  };
}

export async function crearNomina(req, res) {
  try {
    const {
      empleadoId,
      periodoInicio,
      periodoFin,
      salarioBase,
      bonificaciones,
      descuentos,
    } = req.body;

    if (!empleadoId || !periodoInicio || !periodoFin) {
      return res.status(400).json({
        error: "empleadoId, periodoInicio y periodoFin son obligatorios",
      });
    }

    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
    });

    if (!empleado) {
      return res.status(404).json({
        error: "Empleado no encontrado",
      });
    }

    if (!empleado.activo) {
      return res.status(400).json({
        error: "No se puede generar nómina para un empleado inactivo",
      });
    }

    // Normalizar las fechas del período.
    const fechaInicioNormalizada = String(periodoInicio).slice(0, 10);
    const inicio = diaUtc(fechaInicioNormalizada, false);

    let fechaFinNormalizada = String(periodoFin).slice(0, 10);

    const [anioInicio, mesInicio, diaInicio] =
      fechaInicioNormalizada.split("-").map(Number);

    const [anioFin, mesFin, diaFin] =
      fechaFinNormalizada.split("-").map(Number);

    const ultimoDiaMes = new Date(
      Date.UTC(anioFin, mesFin, 0)
    ).getUTCDate();

    // Si la segunda quincena termina el día 30 de un mes
    // de 31 días, usar el último día del mes.
    if (
      diaInicio === 16 &&
      anioInicio === anioFin &&
      mesInicio === mesFin &&
      diaFin === 30 &&
      ultimoDiaMes === 31
    ) {
      fechaFinNormalizada =
        `${anioFin}-${String(mesFin).padStart(2, "0")}-${String(
          ultimoDiaMes
        ).padStart(2, "0")}`;
    }

    const fin = diaUtc(fechaFinNormalizada, false);

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime())
    ) {
      return res.status(400).json({
        error: "Las fechas del periodo no son válidas",
      });
    }

    if (inicio > fin) {
      return res.status(400).json({
        error: "El periodo de inicio no puede ser posterior al periodo final",
      });
    }

    // Validar que el período corresponda a una quincena completa.
    const mismoMes =
      anioInicio === anioFin &&
      mesInicio === mesFin;

    const primeraQuincena =
      mismoMes &&
      diaInicio === 1 &&
      diaFin === 15;

    const segundaQuincena =
      mismoMes &&
      diaInicio === 16 &&
      Number(fechaFinNormalizada.slice(8, 10)) === ultimoDiaMes;

    if (!primeraQuincena && !segundaQuincena) {
      return res.status(400).json({
        error:
          "El período debe corresponder a una quincena completa: del 1 al 15 o del 16 al último día del mes.",
      });
    }

    // Buscar cualquier nómina del empleado que se cruce
    // con el período solicitado.
    const nominasExistentes = await prisma.nomina.findMany({
      where: {
        empleadoId,
        periodoInicio: {
          lte: diaUtc(fechaFinNormalizada, true),
        },
        periodoFin: {
          gte: inicio,
        },
      },
      select: {
        id: true,
        periodoInicio: true,
        periodoFin: true,
        estado: true,
      },
    });

    // Si hay más de una nómina superpuesta, no modificar ninguna.
    if (nominasExistentes.length > 1) {
      return res.status(409).json({
        error:
          "Existen varias nóminas que se cruzan con este período. Revise los registros antes de continuar.",
        nominas: nominasExistentes,
      });
    }

    const nominaExistente = nominasExistentes[0] ?? null;

    if (nominaExistente) {
      const inicioExistente = nominaExistente.periodoInicio
        .toISOString()
        .slice(0, 10);

      const finExistente = nominaExistente.periodoFin
        .toISOString()
        .slice(0, 10);

      const mismoPeriodo =
        inicioExistente === fechaInicioNormalizada &&
        finExistente === fechaFinNormalizada;

      if (!mismoPeriodo) {
        return res.status(409).json({
          error:
            "Ya existe una nómina con un período que se cruza con el solicitado. No se creó ni modificó ninguna nómina.",
          nomina: nominaExistente,
        });
      }

      if (nominaExistente.estado !== "CALCULADA") {
        return res.status(409).json({
          error:
            `La nómina existente está en estado ${nominaExistente.estado}. Solo se pueden recalcular nóminas CALCULADAS.`,
        });
      }
    }

    const novedades = await obtenerNovedadesAprobadas(
      empleadoId,
      inicio,
      fin
    );

    const historialIncapacidades = await obtenerHistorialIncapacidades(
      empleadoId,
      fin
    );

    const historialCalamidades = await obtenerHistorialCalamidades(
      empleadoId,
      fin
    );

    const programaciones = await obtenerProgramacionesCumplidas(
      empleadoId,
      inicio,
      fin
    );

    const salario = redondearMoneda(
      Number(nomina.empleado.salarioBase)
    );

    const incapacidad = calcularIncapacidades(
      historialIncapacidades,
      salario,
      inicio,
      fin
    );

    const fechasIncapacidad = incapacidad.detalle.map(
      (item) => item.fecha
    );

    const fechasDescanso = programaciones
      .filter(
        (programacion) =>
          programacion.tipoProgramacion === "DESCANSO"
      )
      .map((programacion) =>
        programacion.fecha.toISOString().slice(0, 10)
      );

      const calamidad = calcularDescuentoCalamidad(
        historialCalamidades,
        salario,
        inicio,
        fin,
        [...fechasIncapacidad, ...fechasDescanso]
      );

      const descuentoCalamidad = redondearMoneda(
        calamidad.valorTotal
      );

      const novedadesParaAnalisis = [
        ...new Map(
          [...novedades, ...historialCalamidades].map(
            (novedad) => [novedad.id, novedad]
          )
        ).values(),
      ];

      const analisisProgramaciones = analizarProgramaciones(
      programaciones,
      {},
      novedadesParaAnalisis,
      fechasIncapacidad
    );


    const dias = diasDelPeriodo(inicio, fin);

    const {
      valorDia,
      descuentoSalario,
      salarioCausado: salarioCausadoBase,
    } = calcularSalarioCausado(salario, incapacidad, dias);

    const salarioCausado = Math.max(
      0,
      salarioCausadoBase - descuentoCalamidad
    );

    const { valorHora, horasExtra, recargos } =
      calcularValoresNomina(analisisProgramaciones, salario);

    const { detalleHorasExtra, detalleRecargos } =
      calcularDetalleConceptos(analisisProgramaciones, salario, {
        horasExtra,
        recargos,
      });

    const auxilio = calcularAuxilio(salario, dias);

    const bono = redondearMoneda(Number(bonificaciones ?? 0));
    const descuento = redondearMoneda(Number(descuentos ?? 0));

    if (
      salario < 0 ||
      horasExtra < 0 ||
      recargos < 0 ||
      incapacidad.valorTotal < 0 ||
      bono < 0 ||
      descuento < 0
    ) {
      return res.status(400).json({
        error: "Los valores monetarios no pueden ser negativos",
      });
    }

    const {
      ibc,
      salud,
      pension,
      totalDevengado,
      totalDeducciones,
      netoPagar,
    } = totalesDeNomina({
      salarioCausado,
      horasExtra,
      recargos,
      bono,
      descuento,
      auxilio,
    });


    const datos = {
      salarioBase: Number((salario / 2).toFixed(2)),
      horasExtra,
      recargos,
      bonificaciones: bono,
      descuentos: descuento,
      auxilioTransporte: auxilio,
      ingresoBaseCotizacion: ibc,
      salud,
      pension,
      totalDevengado,
      totalDeducciones,
      netoPagar,
      estado: "CALCULADA",
    };


    const includeEmpleado = {
      empleado: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          documento: true,
          salarioBase: true,
          activo: true,
        },
      },
    };

    const nomina = nominaExistente
      ? await prisma.nomina.update({
          where: { id: nominaExistente.id },
          data: datos,
          include: includeEmpleado,
        })
      : await prisma.nomina.create({
          data: {
            empleadoId,
            periodoInicio: inicio,
            periodoFin: fin,
            ...datos,
          },
          include: includeEmpleado,
        });

    return res.status(nominaExistente ? 200 : 201).json({
      mensaje: nominaExistente
        ? "Nómina recalculada correctamente"
        : "Nómina creada correctamente",
      nomina,
      analisisProgramaciones,
      detalleHorasExtra,
      detalleRecargos,
      valorHora,
      novedades,
      incapacidad,
      calamidad,
      descuentoCalamidad,
      auxilio,
      salud,
      pension,
      ibc,
      dias,
      salarioCausado: redondearMoneda(salarioCausado),
      descuentoSalario: redondearMoneda(descuentoSalario),
      valorDia: redondearMoneda(valorDia),
    });
  } catch (error) {
    console.error("ERROR CREANDO NÓMINA:", error);

    return res.status(500).json({
      error: "Error al crear la nómina",
      detalle: error.message,
    });
  }
}

export async function listarNominas(req, res) {
  try {
    const nominas = await prisma.nomina.findMany({
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            documento: true,
            salarioBase: true,
            activo: true,
          },
        },
      },
      orderBy: { periodoInicio: "desc" },
    });

    return res.json(nominas);
  } catch (error) {
    console.error("ERROR LISTANDO NÓMINAS:", error);

    return res.status(500).json({
      error: "Error al listar las nóminas",
      detalle: error.message,
    });
  }
}

export async function obtenerNomina(req, res) {
  try {
    const { id } = req.params;

    const nomina = await prisma.nomina.findUnique({
      where: { id },
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            documento: true,
            salarioBase: true,
            activo: true,
          },
        },
      },
    });

    if (!nomina) {
      return res.status(404).json({
        error: "Nómina no encontrada",
      });
    }

    const inicio = nomina.periodoInicio;
    const fin = nomina.periodoFin;

    const [
      historialIncapacidades,
      historialCalamidades,
      programaciones,
    ] = await Promise.all([
      obtenerHistorialIncapacidades(nomina.empleadoId, fin),
      obtenerHistorialCalamidades(nomina.empleadoId, fin),
      obtenerProgramacionesCumplidas(
        nomina.empleadoId,
        inicio,
        fin
      ),
    ]);

    const salario = redondearMoneda(
      Number(nomina.empleado.salarioBase)
    );

    const incapacidad = calcularIncapacidades(
      historialIncapacidades,
      salario,
      inicio,
      fin
    );

    const fechasIncapacidad = incapacidad.detalle.map(
      (item) => item.fecha
    );

    const fechasDescanso = programaciones
      .filter(
        (programacion) =>
          programacion.tipoProgramacion === "DESCANSO"
      )
      .map((programacion) =>
        programacion.fecha.toISOString().slice(0, 10)
      );

    const calamidad = calcularDescuentoCalamidad(
      historialCalamidades,
      salario,
      inicio,
      fin,
      [...fechasIncapacidad, ...fechasDescanso]
    );

    return res.json({
      ...nomina,
      calamidad,
      descuentoCalamidad: redondearMoneda(
        calamidad.valorTotal
      ),
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO NÓMINA:", error);

    return res.status(500).json({
      error: "Error al obtener la nómina",
      detalle: error.message,
    });
  }
}

export async function actualizarNomina(req, res) {
  try {
    const { id } = req.params;

    const nomina = await prisma.nomina.findUnique({
      where: { id },
    });

    if (!nomina) {
      return res.status(404).json({
        error: "Nómina no encontrada",
      });
    }

    // Solo se permite recalcular nóminas en estado CALCULADA.
    if (nomina.estado !== "CALCULADA") {
      return res.status(409).json({
        error: `No se puede recalcular una nómina en estado ${nomina.estado}. Solo se permiten nóminas CALCULADAS.`,
      });
    }

    // Verificar si existen nóminas duplicadas para la misma quincena.
    const fechaInicioNormalizada = nomina.periodoInicio
      .toISOString()
      .slice(0, 10);

    let fechaFinNormalizada = nomina.periodoFin
      .toISOString()
      .slice(0, 10);

    const [anioInicio, mesInicio, diaInicio] =
      fechaInicioNormalizada.split("-").map(Number);

    const [anioFin, mesFin, diaFin] =
      fechaFinNormalizada.split("-").map(Number);

    const ultimoDiaMes = new Date(
      Date.UTC(anioFin, mesFin, 0)
    ).getUTCDate();

    if (
      diaInicio === 16 &&
      anioInicio === anioFin &&
      mesInicio === mesFin &&
      diaFin === 30 &&
      ultimoDiaMes === 31
    ) {
      fechaFinNormalizada =
        `${anioFin}-${String(mesFin).padStart(2, "0")}-${String(
          ultimoDiaMes
        ).padStart(2, "0")}`;
    }

    // Validar que la nómina corresponda a una quincena completa.
    const mismoMes =
      anioInicio === anioFin &&
      mesInicio === mesFin;

    const ultimoDiaPeriodo = new Date(
      Date.UTC(anioInicio, mesInicio, 0)
    ).getUTCDate();

    const diaFinNormalizado = Number(
      fechaFinNormalizada.slice(8, 10)
    );

    const primeraQuincena =
      mismoMes &&
      diaInicio === 1 &&
      diaFinNormalizado === 15;

    const segundaQuincena =
      mismoMes &&
      diaInicio === 16 &&
      diaFinNormalizado === ultimoDiaPeriodo;

    if (!primeraQuincena && !segundaQuincena) {
      return res.status(409).json({
        error:
          "No se puede recalcular esta nómina porque su período no corresponde a una quincena completa. Revise el registro histórico.",
      });
    }

    const nominasDelPeriodo = await prisma.nomina.findMany({
      where: {
        empleadoId: nomina.empleadoId,
        periodoInicio: {
          gte: diaUtc(fechaInicioNormalizada, false),
          lte: diaUtc(fechaInicioNormalizada, true),
        },
        periodoFin: {
          gte: diaUtc(fechaInicioNormalizada, false),
          lte: diaUtc(fechaFinNormalizada, true),
        },
      },
      select: {
        id: true,
        periodoInicio: true,
        periodoFin: true,
      },
    });

    if (nominasDelPeriodo.length > 1) {
      return res.status(409).json({
        error:
          "Existen varias nóminas para esta quincena. No se puede recalcular hasta revisar los registros duplicados.",
        nominas: nominasDelPeriodo,
      });
    }

    const empleado = await prisma.empleado.findUnique({
      where: { id: nomina.empleadoId },
    });

    if (!empleado) {
      return res.status(404).json({
        error: "Empleado no encontrado",
      });
    }

    const inicio = diaUtc(nomina.periodoInicio, false);
    const fin = diaUtc(nomina.periodoFin, true);

    const novedades = await obtenerNovedadesAprobadas(
      nomina.empleadoId,
      inicio,
      fin
    );

    const historialIncapacidades = await obtenerHistorialIncapacidades(
      nomina.empleadoId,
      fin
    );

    const historialCalamidades = await obtenerHistorialCalamidades(
    nomina.empleadoId,
    fin
  );

    const programaciones = await obtenerProgramacionesCumplidas(
      nomina.empleadoId,
      inicio,
      fin
    );

    const salarioBase = redondearMoneda(Number(empleado.salarioBase));

    const incapacidad = calcularIncapacidades(
      historialIncapacidades,
      salarioBase,
      inicio,
      fin
    );

    const fechasIncapacidad = incapacidad.detalle.map(
      (item) => item.fecha
    );

    const fechasDescanso = programaciones
  .filter(
    (programacion) =>
      programacion.tipoProgramacion === "DESCANSO"
  )
  .map((programacion) =>
    programacion.fecha.toISOString().slice(0, 10)
  );

const calamidad = calcularDescuentoCalamidad(
  historialCalamidades,
  salarioBase,
  inicio,
  fin,
  [...fechasIncapacidad, ...fechasDescanso]
);

const descuentoCalamidad = redondearMoneda(
  calamidad.valorTotal
);

const novedadesParaAnalisis = [
  ...new Map(
    [...novedades, ...historialCalamidades].map(
      (novedad) => [novedad.id, novedad]
    )
  ).values(),
];

const analisisProgramaciones = analizarProgramaciones(
  programaciones,
  {},
  novedadesParaAnalisis,
  fechasIncapacidad
);

    const dias = diasDelPeriodo(
      diaUtc(nomina.periodoInicio, false),
      diaUtc(nomina.periodoFin, false)
    );

    const {
      valorDia,
      descuentoSalario,
      salarioCausado: salarioCausadoBase,
    } = calcularSalarioCausado(salarioBase, incapacidad, dias);

    const salarioCausado = Math.max(
      0,
      salarioCausadoBase - descuentoCalamidad
    );

    const { valorHora, horasExtra, recargos } =
      calcularValoresNomina(analisisProgramaciones, salarioBase);

    const { detalleHorasExtra, detalleRecargos } =
      calcularDetalleConceptos(analisisProgramaciones, salarioBase, {
        horasExtra,
        recargos,
      });

    const auxilio = calcularAuxilio(salarioBase, dias);
    const bonificaciones = redondearMoneda(
      Number(nomina.bonificaciones || 0)
    );
    const descuentos = redondearMoneda(
      Number(nomina.descuentos || 0)
    );

    const {
      ibc,
      salud,
      pension,
      totalDevengado,
      totalDeducciones,
      netoPagar,
    } = totalesDeNomina({
      salarioCausado,
      horasExtra,
      recargos,
      bono: bonificaciones,
      descuento: descuentos,
      auxilio,
    });

    const nominaActualizada = await prisma.nomina.update({
      where: { id },
      data: {
        salarioBase: Number((salarioBase / 2).toFixed(2)),
        horasExtra,
        recargos,
        bonificaciones,
        descuentos,
        auxilioTransporte: auxilio,
        ingresoBaseCotizacion: ibc,
        salud,
        pension,
        totalDevengado,
        totalDeducciones,
        netoPagar,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            documento: true,
            salarioBase: true,
            activo: true,
          },
        },
      },
    });

    return res.json({
      mensaje: "Nómina recalculada correctamente",
      nomina: nominaActualizada,
      analisisProgramaciones,
      valorHora,
      detalleHorasExtra,
      detalleRecargos,
      novedades,
      incapacidad,
      calamidad,
      descuentoCalamidad,
      auxilio,
      salud,
      pension,
      ibc,
      dias,
      salarioCausado: redondearMoneda(salarioCausado),
      descuentoSalario: redondearMoneda(descuentoSalario),
      valorDia: redondearMoneda(valorDia),
    });

  } catch (error) {
    console.error("ERROR RECALCULANDO NÓMINA:", error);

    return res.status(500).json({
      error: "Error al recalcular la nómina",
      detalle: error.message,
    });
  }
}

export async function cambiarEstadoNomina(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Definir las transiciones permitidas.
    const transicionesPermitidas = {
      CALCULADA: ["APROBADA", "ANULADA"],
      APROBADA: ["PAGADA", "ANULADA"],
      PAGADA: [],
      ANULADA: [],
    };

    const estadosValidos = Object.keys(transicionesPermitidas);

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado de nómina no válido",
      });
    }

    const nomina = await prisma.nomina.findUnique({
      where: { id },
    });

    if (!nomina) {
      return res.status(404).json({
        error: "Nómina no encontrada",
      });
    }

    const transiciones = transicionesPermitidas[nomina.estado] ?? [];

    if (!transiciones.includes(estado)) {
      return res.status(409).json({
        error: `No se puede cambiar una nómina de ${nomina.estado} a ${estado}.`,
      });
    }

    const nominaActualizada = await prisma.nomina.update({
      where: { id },
      data: { estado },
    });

    return res.json({
      mensaje: "Estado de nómina actualizado correctamente",
      nomina: nominaActualizada,
    });
  } catch (error) {
    console.error("ERROR CAMBIANDO ESTADO:", error);

    return res.status(500).json({
      error: "Error al cambiar el estado de la nómina",
      detalle: error.message,
    });
  }
}