import prisma from './src/config/database.js';

async function asignarCargoCarlos() {
  try {
    const empleado = await prisma.empleado.findUnique({
      where: {
        id: '32182ebe-3782-46f0-b751-7b2adcf07975'
      }
    });

    if (!empleado) {
      console.log('No se encontró el empleado Carlos.');
      return;
    }

    const empleadoActualizado = await prisma.empleado.update({
      where: {
        id: '32182ebe-3782-46f0-b751-7b2adcf07975'
      },
      data: {
        cargoId: '9152d650-6910-4afc-ab8f-e12c98a93a0a'
      },
      include: {
        cargoCatalogo: true
      }
    });

    console.log('Empleado actualizado correctamente:');
    console.log(empleadoActualizado);
  } catch (error) {
    console.error('Error al asignar el cargo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

asignarCargoCarlos();