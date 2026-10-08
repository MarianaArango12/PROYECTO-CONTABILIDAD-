const API_URL = 'http://localhost:3000/api';

export async function obtenerNovedades() {
  const token = localStorage.getItem('token');

  const respuesta = await fetch(`${API_URL}/novedades`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error al obtener las novedades');
  }

  return datos;
}

export async function crearNovedad(novedad) {
  const token = localStorage.getItem('token');

  const respuesta = await fetch(`${API_URL}/novedades`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(novedad),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error al crear la novedad');
  }

  return datos;
}

export async function aprobarNovedad(id) {
  const token = localStorage.getItem('token');

  const respuesta = await fetch(`${API_URL}/novedades/${id}/aprobar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error al aprobar la novedad');
  }

  return datos;
}

export async function rechazarNovedad(id) {
  const token = localStorage.getItem('token');

  const respuesta = await fetch(`${API_URL}/novedades/${id}/rechazar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error al rechazar la novedad');
  }

  return datos;
}