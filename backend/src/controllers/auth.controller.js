import prisma from '../config/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function register(req, res) {
  try {
    const {
      nombre,
      email,
      password,
      rolId,
      empresaId
    } = req.body;

    // Validar campos obligatorios
    if (
      !nombre ||
      !email ||
      !password ||
      !rolId ||
      !empresaId
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    // Verificar si el correo ya existe
    const existente = await prisma.usuario.findUnique({
      where: {
        email
      }
    });

    if (existente) {
      return res.status(409).json({
        error: 'El correo ya está registrado'
      });
    }

    // Verificar que el rol exista
    const rol = await prisma.rol.findUnique({
      where: {
        id: rolId
      }
    });

    if (!rol) {
      return res.status(400).json({
        error: 'El rol no existe'
      });
    }

    // Verificar que la empresa exista y esté activa
    const empresa = await prisma.empresa.findUnique({
      where: {
        id: empresaId
      }
    });

    if (!empresa || !empresa.activo) {
      return res.status(400).json({
        error: 'La empresa no existe o está inactiva'
      });
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hash,
        rolId,
        empresaId
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rolId: true,
        empresaId: true
      }
    });

    return res.status(201).json(usuario);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al registrar usuario'
    });
  }
}

export async function login(req, res) {
  try {
    const {
      email,
      password
    } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        error: 'Correo y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: {
        email
      },
      include: {
        rol: true
      }
    });

    // Verificar existencia y estado
    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Comparar contraseña
    const valido = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!valido) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Crear token
    const token = jwt.sign(
      {
        id: usuario.id,
        empresaId: usuario.empresaId,
        rol: usuario.rol.nombre
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    // Respuesta
    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol.nombre,
        empresaId: usuario.empresaId
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Error al iniciar sesión'
    });
  }
}

