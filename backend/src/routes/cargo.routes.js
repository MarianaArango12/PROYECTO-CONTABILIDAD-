import { Router } from 'express';

import {
  crearCargo,
  listarCargos,
  obtenerCargo,
  actualizarCargo,
  cambiarEstadoCargo
} from '../controllers/cargo.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  verificarToken,
  verificarRol('Administrador'),
  crearCargo
);

router.get(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Programador'),
  listarCargos
);

router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Programador'),
  obtenerCargo
);

router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  actualizarCargo
);

router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador'),
  cambiarEstadoCargo
);

export default router;