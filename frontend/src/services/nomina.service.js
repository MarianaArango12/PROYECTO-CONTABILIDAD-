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

export async function obtenerNominas() {
  const respuesta = await fetch(`${API_URL}/nominas`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudieron obtener las nóminas'
  );
}

export async function obtenerNomina(id) {
  const respuesta = await fetch(`${API_URL}/nominas/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo obtener la nómina'
  );
}

export async function crearNomina(datosNomina) {
  const respuesta = await fetch(`${API_URL}/nominas`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosNomina),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo calcular la nómina'
  );
}

export async function actualizarNomina(id, datosNomina) {
  const respuesta = await fetch(
    `${API_URL}/nominas/${id}`,
    {
      method: 'PUT',
      headers: obtenerHeaders(),
      body: JSON.stringify(datosNomina),
    }
  );

  return await procesarRespuesta(
    respuesta,
    'No se pudo actualizar la nómina'
  );
}

export async function cambiarEstadoNomina(id, estado) {
  const respuesta = await fetch(
    `${API_URL}/nominas/${id}/estado`,
    {
      method: 'PATCH',
      headers: obtenerHeaders(),
      body: JSON.stringify({ estado }),
    }
  );

  return await procesarRespuesta(
    respuesta,
    'No se pudo cambiar el estado de la nómina'
  );
}