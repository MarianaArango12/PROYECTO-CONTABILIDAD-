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

export async function obtenerTurnos() {
  const respuesta = await fetch(`${API_URL}/turnos`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudieron obtener los turnos'
  );
}

export async function crearTurno(datosTurno) {
  const respuesta = await fetch(`${API_URL}/turnos`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosTurno),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo crear el turno'
  );
}

export async function obtenerTurno(id) {
  const respuesta = await fetch(`${API_URL}/turnos/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo obtener el turno'
  );
}

export async function actualizarTurno(id, datosTurno) {
  const respuesta = await fetch(`${API_URL}/turnos/${id}`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosTurno),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo actualizar el turno'
  );
}

export async function cambiarEstadoTurno(id, activo) {
  const respuesta = await fetch(
    `${API_URL}/turnos/${id}/estado`,
    {
      method: 'PATCH',
      headers: obtenerHeaders(),
      body: JSON.stringify({ activo }),
    }
  );

  return await procesarRespuesta(
    respuesta,
    'No se pudo cambiar el estado del turno'
  );
}