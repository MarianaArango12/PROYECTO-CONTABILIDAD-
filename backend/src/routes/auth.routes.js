import { Router } from 'express';

import { register, login } from '../controllers/auth.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// REGISTRAR USUARIO
// Solamente Administrador
router.post(
  '/register',
  verificarToken,
  verificarRol('Administrador'),
  register
);

// INICIAR SESIÓN
// Ruta pública
router.post(
  '/login',
  login
);

export default router;

