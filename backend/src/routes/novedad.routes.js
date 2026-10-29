import { Router } from 'express';

import {
  crearNovedad,
  listarNovedades,
  obtenerNovedad,
  aprobarNovedad,
  rechazarNovedad
} from '../controllers/novedad.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// Crear novedades
// El Administrador y el Programador pueden crear
router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Programador'),
  crearNovedad
);

// Consultar todas las novedades
// Administrador, Programador y Nómina pueden consultar
router.get(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Programador', 'Nómina'),
  listarNovedades
);

// Consultar una novedad específica
router.get(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Programador', 'Nómina'),
  obtenerNovedad
);

// Aprobar novedad
// SOLAMENTE Nómina
router.put(
  '/:id/aprobar',
  verificarToken,
  verificarRol('Administrador', 'Nómina'),
  aprobarNovedad
);

// Rechazar novedad
// SOLAMENTE Nómina
router.put(
  '/:id/rechazar',
  verificarToken,
  verificarRol('Administrador','Nómina'),
  rechazarNovedad
);

export default router;