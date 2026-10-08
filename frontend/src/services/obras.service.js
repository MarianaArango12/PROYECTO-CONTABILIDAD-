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

// ======================================================
// OBTENER OBRAS
// ======================================================

export async function obtenerObras() {
  const respuesta = await fetch(`${API_URL}/obras`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudieron obtener las obras'
  );
}

// ======================================================
// OBTENER UNA OBRA
// ======================================================

export async function obtenerObra(id) {
  const respuesta = await fetch(`${API_URL}/obras/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo obtener la obra'
  );
}

// ======================================================
// CREAR OBRA
// ======================================================

export async function crearObra(datosObra) {
  const respuesta = await fetch(`${API_URL}/obras`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosObra),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo crear la obra'
  );
}

// ======================================================
// ACTUALIZAR OBRA
// ======================================================

export async function actualizarObra(id, datosObra) {
  const respuesta = await fetch(`${API_URL}/obras/${id}`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosObra),
  });

  return await procesarRespuesta(
    respuesta,
    'No se pudo actualizar la obra'
  );
}

// ======================================================
// CAMBIAR ESTADO DE LA OBRA
// ======================================================

export async function cambiarEstadoObra(id, activo) {
  const respuesta = await fetch(
    `${API_URL}/obras/${id}/estado`,
    {
      method: 'PATCH',
      headers: obtenerHeaders(),
      body: JSON.stringify({
        activo,
      }),
    }
  );

  return await procesarRespuesta(
    respuesta,
    'No se pudo cambiar el estado de la obra'
  );
}

