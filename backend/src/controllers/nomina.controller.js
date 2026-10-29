import prisma from "../config/database.js";
import {
  obtenerNovedadesAprobadas,
  obtenerProgramacionesCumplidas,
  analizarProgramaciones,
  calcularIncapacidades,
} from "../services/nomina.service.js";
import { PARAMETROS_LABORALES } from "../config/parametrosLaborales.js";

function redondearMoneda(valor) {
  return Math.round(Number(valor));
}

function diaUtc(valor, finDelDia) {
  const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
  return new Date(`${texto}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function diasDelPeriodo(inicio, fin) {
  const desde = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
  const hasta = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate());
  return Math.round((hasta - desde) / 86400000) + 1;
}

function calcularAuxilio(salario, dias) {
  const minimo = PARAMETROS_LABORALES.salarioMinimo ?? 1750905;
  if (Number(salario) > minimo * 2) return 0;
  const auxilioQuincena = PARAMETROS_LABORALES.auxilioQuincena ?? 124548;
  return redondearMoneda((auxilioQuincena / 15) * Math.min(dias, 30));
}

function calcularValoresNomina(analisisProgramaciones, salarioBase) {
  const salario = Number(salarioBase);
  const valorHoraSinRedondear = salario / PARAMETROS_LABORALES.horasMensuales;

  const horasExtraSinRedondear =
    analisisProgramaciones.horasExtraDiurnas * valorHoraSinRedondear * (1 + PARAMETROS_LABORALES.horasExtra.diurna) +
    analisisProgramaciones.horasExtraNocturnas * valorHoraSinRedondear * (1 + PARAMETROS_LABORALES.horasExtra.nocturna) +
    analisisProgramaciones.horasExtraDiurnasFestivas * valorHoraSinRedondear * (1 + PARAMETROS_LABORALES.horasExtra.festivaDiurna) +
    analisisProgramaciones.horasExtraNocturnasFestivas * valorHoraSinRedondear * (1 + PARAMETROS_LABORALES.horasExtra.festivaNocturna);

  const recargosSinRedondear =
    analisisProgramaciones.recargoNocturno * valorHoraSinRedondear * PARAMETROS_LABORALES.recargos.nocturno +
    analisisProgramaciones.recargoFestivo * valorHoraSinRedondear * PARAMETROS_LABORALES.recargos.festivo +
    analisisProgramaciones.recargoNocturnoFestivo * valorHoraSinRedondear * PARAMETROS_LABORALES.recargos.nocturnoFestivo;

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
    const tarifaExacta = valorHoraExacto * (
      incluyeBase ? 1 + factor : factor
    );

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

    // Compensa el redondeo para que el detalle coincida
    // exactamente con el total calculado por la nómina.
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

function calcularSalarioCausado(salarioBase, incapacidad, diasPeriodo) {
  const salario = Number(salarioBase);
  const valorDia = salario / 30;
  const dias = Math.min(Number(diasPeriodo) || 0, 30);
  const diasIncapacidad = Number(incapacidad?.cantidadDias ?? 0);
  const descuentoSalario = valorDia * diasIncapacidad;
  const salarioCausado = valorDia * dias - descuentoSalario + Number(incapacidad?.valorTotal ?? 0);

  return { valorDia, descuentoSalario, salarioCausado, dias };
}

function totalesDeNomina({ salarioCausado, horasExtra, recargos, bono, descuento, auxilio }) {
  const ibc = redondearMoneda(Math.max(0, salarioCausado + horasExtra + recargos));
  const salud = redondearMoneda(
  ibc * PARAMETROS_LABORALES.aportesTrabajador.salud
);

  const pension = redondearMoneda(
  ibc * PARAMETROS_LABORALES.aportesTrabajador.pension
);
  const totalDevengado = redondearMoneda(salarioCausado + horasExtra + recargos + bono +                          auxilio);
  const totalDeducciones = redondearMoneda(salud + pension + descuento);
  const netoPagar = redondearMoneda(totalDevengado - totalDeducciones);

  return { ibc, salud, pension, totalDevengado, totalDeducciones, netoPagar };
}

export async function crearNomina(req, res) {
  try {
    const { empleadoId, periodoInicio, periodoFin, salarioBase, bonificaciones, descuentos } = req.body;

    if (!empleadoId || !periodoInicio || !periodoFin) {
      return res.status(400).json({
        error: "empleadoId, periodoInicio y periodoFin son obligatorios",
      });
    }

    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
    });

    if (!empleado) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    if (!empleado.activo) {
      return res.status(400).json({
        error: "No se puede generar nómina para un empleado inactivo",
      });
    }

    const inicio = diaUtc(periodoInicio, false);
    const fin = diaUtc(periodoFin, false);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return res.status(400).json({ error: "Las fechas del periodo no son válidas" });
    }

    if (inicio > fin) {
      return res.status(400).json({
        error: "El periodo de inicio no puede ser posterior al periodo final",
      });
    }

    const nominaExistente = await prisma.nomina.findFirst({
      where: {
        empleadoId,
        periodoInicio: { gte: inicio, lte: diaUtc(periodoInicio, true) },
        periodoFin: { gte: fin, lte: diaUtc(periodoFin, true) },
      },
    });

    const novedades = await obtenerNovedadesAprobadas(empleadoId, inicio, fin);
    const programaciones = await obtenerProgramacionesCumplidas(empleadoId, inicio, fin);
    const analisisProgramaciones = analizarProgramaciones(programaciones, {}, novedades);

    const salario = redondearMoneda(Number(salarioBase ?? empleado.salarioBase));
    const incapacidad = calcularIncapacidades(novedades, salario);
    const dias = diasDelPeriodo(inicio, fin);
    const { valorDia, descuentoSalario, salarioCausado } = calcularSalarioCausado(salario, incapacidad, dias);


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

    if (salario < 0 || horasExtra < 0 || recargos < 0 || incapacidad.valorTotal < 0 || bono < 0 || descuento < 0) {
      return res.status(400).json({
        error: "Los valores monetarios no pueden ser negativos",
      });
    }

    const { ibc, salud, pension, totalDevengado, totalDeducciones, netoPagar } = totalesDeNomina({
      salarioCausado,
      horasExtra,
      recargos,
      bono,
      descuento,
      auxilio,
    });


    const datos = {
      salarioBase: salario,
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
          data: { empleadoId, periodoInicio: inicio, periodoFin: fin, ...datos },
          include: includeEmpleado,
        });

    return res.status(nominaExistente ? 200 : 201).json({
      mensaje: nominaExistente ? "Nómina recalculada correctamente" : "Nómina creada correctamente",
      nomina,
      analisisProgramaciones,detalleHorasExtra,detalleRecargos,
      valorHora,
      novedades,
      incapacidad,
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
      return res.status(404).json({ error: "Nómina no encontrada" });
    }

    return res.json(nomina);
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
    const nomina = await prisma.nomina.findUnique({ where: { id } });

    if (!nomina) {
      return res.status(404).json({ error: "Nómina no encontrada" });
    }

    const empleado = await prisma.empleado.findUnique({
      where: { id: nomina.empleadoId },
    });

    if (!empleado) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    const novedades = await obtenerNovedadesAprobadas(nomina.empleadoId, diaUtc(nomina.periodoInicio, false), diaUtc(nomina.periodoFin, true));
    const programaciones = await obtenerProgramacionesCumplidas(nomina.empleadoId, diaUtc(nomina.periodoInicio, false), diaUtc(nomina.periodoFin, true));
    const analisisProgramaciones = analizarProgramaciones(programaciones, {}, novedades);
    const salarioBase = redondearMoneda(Number(empleado.salarioBase));
    const incapacidad = calcularIncapacidades(novedades, salarioBase);
    const dias = diasDelPeriodo(diaUtc(nomina.periodoInicio, false), diaUtc(nomina.periodoFin, false));
    const { valorDia, descuentoSalario, salarioCausado } = calcularSalarioCausado(salarioBase, incapacidad, dias);
    const { valorHora, horasExtra, recargos } = calcularValoresNomina(analisisProgramaciones, salarioBase);
    const { detalleHorasExtra, detalleRecargos } =
      calcularDetalleConceptos(analisisProgramaciones, salarioBase, {
        horasExtra,
        recargos,
      });
    const auxilio = calcularAuxilio(salarioBase, dias);
    const bonificaciones = redondearMoneda(Number(nomina.bonificaciones || 0));
    const descuentos = redondearMoneda(Number(nomina.descuentos || 0));
    const { ibc, salud, pension, totalDevengado, totalDeducciones, netoPagar } = totalesDeNomina({
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
        salarioBase,
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
    const estadosPermitidos = ["CALCULADA", "APROBADA", "PAGADA", "ANULADA"];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ error: "Estado de nómina no válido" });
    }

    const nomina = await prisma.nomina.findUnique({ where: { id } });

    if (!nomina) {
      return res.status(404).json({ error: "Nómina no encontrada" });
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