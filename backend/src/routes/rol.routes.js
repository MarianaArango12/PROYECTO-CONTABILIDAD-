import { Router } from 'express';

import {
  listarRoles,
  obtenerRol
} from '../controllers/rol.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/',
  verificarToken,
  verificarRol('Administrador'),
  listarRoles
);

router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador'),
  obtenerRol
);

export default router;