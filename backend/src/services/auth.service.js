import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function iniciarSesion(email, password) {
  const usuario = await prisma.usuario.findUnique({
    where: {
      email,
    },
    include: {
      rol: true,
    },
  });

  if (!usuario) {
    throw new Error('Credenciales inválidas');
  }

  if (!usuario.activo) {
    throw new Error('Usuario inactivo');
  }

  const passwordValida = await bcrypt.compare(
    password,
    usuario.password
  );

  if (!passwordValida) {
    throw new Error('Credenciales inválidas');
  }

  const token = jwt.sign(
    {
      usuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '8h',
    }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol.nombre,
      empresaId: usuario.empresaId,
    },
  };
}

