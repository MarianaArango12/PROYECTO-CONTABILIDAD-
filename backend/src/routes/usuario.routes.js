import { Router } from 'express';

import {
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario
} from '../controllers/usuario.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/',
  verificarToken,
  verificarRol('Administrador'),
  listarUsuarios
);

router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  obtenerUsuario
);

router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  actualizarUsuario
);

router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador'),
  cambiarEstadoUsuario
);

export default router;