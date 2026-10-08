import { Router } from 'express';

import {
  crearObra,
  listarObras,
  obtenerObra,
  actualizarObra,
  cambiarEstadoObra
} from '../controllers/obra.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// ======================================================
// CREAR OBRA
// Administrador y Comercial
// ======================================================

router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Comercial'),
  crearObra
);

// ======================================================
// LISTAR OBRAS
// Administrador, Comercial, Gestión Humana y Programador
// ======================================================

router.get(
  '/',
  verificarToken,
  verificarRol(
    'Administrador',
    'Comercial',
    'Gestión Humana',
    'Programador'
  ),
  listarObras
);

// ======================================================
// OBTENER UNA OBRA
// Administrador, Comercial, Gestión Humana y Programador
// ======================================================

router.get(
  '/:id',
  verificarToken,
  verificarRol(
    'Administrador',
    'Comercial',
    'Gestión Humana',
    'Programador'
  ),
  obtenerObra
);

// ======================================================
// ACTUALIZAR OBRA
// Administrador y Comercial
// ======================================================

router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Comercial'),
  actualizarObra
);

// ======================================================
// ACTIVAR / DESACTIVAR OBRA
// Administrador y Comercial
// ======================================================

router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador', 'Comercial'),
  cambiarEstadoObra
);

export default router;