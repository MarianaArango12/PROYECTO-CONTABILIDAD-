const API_URL = 'http://localhost:3000/api';

function obtenerHeaders() {
  const token = localStorage.getItem('token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function obtenerProgramaciones() {
  const respuesta = await fetch(`${API_URL}/programaciones`, {
    method: 'GET',
    headers: obtenerHeaders(),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || 'No se pudieron obtener las programaciones'
    );
  }

  return datos;
}

export async function obtenerProgramacionesPorEmpleado(
  empleadoId,
  inicio,
  fin
) {
  const parametros = new URLSearchParams();

  if (inicio) {
    parametros.append('inicio', inicio);
  }

  if (fin) {
    parametros.append('fin', fin);
  }

  const query = parametros.toString();

  const respuesta = await fetch(
    `${API_URL}/programaciones/empleado/${empleadoId}${
      query ? `?${query}` : ''
    }`,
    {
      method: 'GET',
      headers: obtenerHeaders(),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error ||
        'No se pudieron obtener las programaciones del empleado'
    );
  }

  return datos;
}

export async function crearProgramacion(datosProgramacion) {
  const respuesta = await fetch(`${API_URL}/programaciones`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datosProgramacion),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || 'No se pudo crear la programación'
    );
  }

  return datos;
}

export async function generarProgramaciones(datosProgramacion) {
  const respuesta = await fetch(
    `${API_URL}/programaciones/generar`,
    {
      method: 'POST',
      headers: obtenerHeaders(),
      body: JSON.stringify(datosProgramacion),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error ||
        'No se pudieron generar las programaciones'
    );
  }

  return datos;
}

export async function actualizarProgramacion(
  id,
  datosProgramacion
) {
  const respuesta = await fetch(
    `${API_URL}/programaciones/${id}`,
    {
      method: 'PUT',
      headers: obtenerHeaders(),
      body: JSON.stringify(datosProgramacion),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || 'No se pudo actualizar la programación'
    );
  }

  return datos;
}

export async function cambiarEstadoProgramacion(
  id,
  estado
) {
  const respuesta = await fetch(
    `${API_URL}/programaciones/${id}/estado`,
    {
      method: 'PATCH',
      headers: obtenerHeaders(),
      body: JSON.stringify({ estado }),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || 'No se pudo cambiar el estado'
    );
  }

  return datos;
}


export async function eliminarProgramacion(id) {
  const respuesta = await fetch(
    `${API_URL}/programaciones/${id}`,
    {
      method: 'DELETE',
      headers: obtenerHeaders(),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.error || 'No se pudo eliminar la programación'
    );
  }

  return datos;
}
