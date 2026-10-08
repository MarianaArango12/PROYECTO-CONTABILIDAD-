import { Router } from 'express';

import {
  crearTurno,
  listarTurnos,
  obtenerTurno,
  actualizarTurno,
  cambiarEstadoTurno
} from '../controllers/turno.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  crearTurno
);

router.get(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Programador'),
  listarTurnos
);

router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Nómina', 'Programador'),
  obtenerTurno
);

router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  actualizarTurno
);

router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  cambiarEstadoTurno
);

export default router;