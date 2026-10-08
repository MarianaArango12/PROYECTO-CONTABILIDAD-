import { Router } from 'express';

import {
  crearNomina,
  listarNominas,
  obtenerNomina,
  actualizarNomina,
  cambiarEstadoNomina
} from '../controllers/nomina.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// CREAR NÓMINA
// Administrador y Nómina
router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  crearNomina
);

// LISTAR NÓMINAS
// Administrador, Nómina y Contador
router.get(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Contador'),
  listarNominas
);

// OBTENER UNA NÓMINA
// Administrador, Nómina y Contador
router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Contador'),
  obtenerNomina
);

// ACTUALIZAR NÓMINA
// Administrador y Nómina
router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  actualizarNomina
);

// CAMBIAR ESTADO
// Administrador y Nómina
router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  cambiarEstadoNomina
);

export default router;

