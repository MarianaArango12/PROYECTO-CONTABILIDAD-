import { Router } from 'express';

import {
  crearEmpresa,
  listarEmpresas,
  obtenerEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
} from '../controllers/empresa.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// CREAR EMPRESA
// Solamente Administrador
router.post(
  '/',
  verificarToken,
  verificarRol('Administrador'),
  crearEmpresa
);

// LISTAR EMPRESAS
// Solamente Administrador
router.get(
  '/',
  verificarToken,
  verificarRol('Administrador'),
  listarEmpresas
);

// OBTENER UNA EMPRESA
// Solamente Administrador
router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  obtenerEmpresa
);

// ACTUALIZAR EMPRESA
// Solamente Administrador
router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  actualizarEmpresa
);

// ELIMINAR EMPRESA
// Solamente Administrador
router.delete(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  eliminarEmpresa
);

export default router;
