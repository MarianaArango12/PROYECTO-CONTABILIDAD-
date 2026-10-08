const API_URL = 'http://localhost:3000/api';

function obtenerHeaders() {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function procesarRespuesta(respuesta, mensajeError) {
  let datos = null;

  try {
    datos = await respuesta.json();
  } catch (error) {
    console.error('Error al leer la respuesta:', error);
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.error ||
      datos?.message ||
      mensajeError
    );
  }

  return datos;
}

export async function obtenerEmpleados() {
  const respuesta = await fetch(`${API_URL}/empleados`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudieron obtener los empleados'
  );
}

export async function crearEmpleado(datosEmpleado) {
  const respuesta = await fetch(`${API_URL}/empleados`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosEmpleado),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo crear el empleado'
  );
}

export async function actualizarEmpleado(id, datosEmpleado) {
  const respuesta = await fetch(`${API_URL}/empleados/${id}`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosEmpleado),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo actualizar el empleado'
  );
}

export async function cambiarEstadoEmpleado(
  id,
  datosRetiro
) {
  const respuesta = await fetch(
    `${API_URL}/empleados/${id}/estado`,
    {
      method: 'PATCH',
      headers: obtenerHeaders(),
      body: JSON.stringify(datosRetiro),
    }
  );

  return await procesarRespuesta(
    respuesta,
    'No se pudo retirar el empleado'
  );
}