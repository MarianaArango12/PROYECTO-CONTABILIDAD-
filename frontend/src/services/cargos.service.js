const API_URL = 'http://localhost:3000/api';

export async function obtenerCargos() {
  const token = localStorage.getItem('token');

  const respuesta = await fetch(`${API_URL}/cargos`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'No se pudieron obtener los cargos');
  }

  return datos;
}
