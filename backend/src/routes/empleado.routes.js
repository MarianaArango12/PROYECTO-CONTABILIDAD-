import { Router } from 'express';

import {
  crearEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  actualizarEmpleado,
  cambiarEstadoEmpleado
} from '../controllers/empleado.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();

// ======================================================
// CREAR EMPLEADO
// Administrador y Gestión Humana
// ======================================================

router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Gestión Humana'),
  crearEmpleado
);

// ======================================================
// LISTAR EMPLEADOS
// Administrador, Gestión Humana, Nómina y Programador
// ======================================================

router.get(
  '/',
  verificarToken,
  verificarRol(
    'Administrador',
    'Gestión Humana',
    'Nómina',
    'Programador'
  ),
  listarEmpleados
);

// ======================================================
// OBTENER EMPLEADO
// Administrador, Gestión Humana, Nómina y Programador
// ======================================================

router.get(
  '/:id',
  verificarToken,
  verificarRol(
    'Administrador',
    'Gestión Humana',
    'Nómina',
    'Programador'
  ),
  obtenerEmpleado
);

// ======================================================
// ACTUALIZAR EMPLEADO
// Administrador y Gestión Humana
// ======================================================

router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Gestión Humana'),
  actualizarEmpleado
);

// RETIRAR EMPLEADO
// Administrador y Gestión Humana

router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador', 'Gestión Humana'),
  cambiarEstadoEmpleado
);

export default router;