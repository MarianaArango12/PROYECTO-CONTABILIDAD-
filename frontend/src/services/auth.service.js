const API_URL = 'http://localhost:3000/api';

export async function iniciarSesion(email, password) {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error al iniciar sesión');
  }

  localStorage.setItem('token', datos.token);
  localStorage.setItem('usuario', JSON.stringify(datos.usuario));

  return datos;
}

export function obtenerUsuarioActual() {
  const usuario = localStorage.getItem('usuario');

  if (!usuario) {
    return null;
  }

  return JSON.parse(usuario);
}

export function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}