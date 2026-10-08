import { Router } from 'express';

import {
  crearProgramacion,
  listarProgramaciones,
  obtenerProgramacion,
  actualizarProgramacion,
  cambiarEstadoProgramacion,
  obtenerProgramacionesPorEmpleado,
  generarProgramaciones
} from '../controllers/programacion.controller.js';

import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRol } from '../middlewares/role.middleware.js';

const router = Router();


//CREAR PROGRAMACIÓN
//Administrador y Programador

router.post(
  '/',
  verificarToken,
  verificarRol('Administrador', 'Programador'),
  crearProgramacion
);


//GENERAR PROGRAMACIONES A PARTIR DE UN PATRÓN (NUEVO)
//Administrador y Programador

router.post(
  '/generar',
  verificarToken,
  verificarRol('Administrador', 'Programador'),
  generarProgramaciones
);

router.get(
  '/empleado/:empleadoId',
  verificarToken,
  verificarRol(
    'Administrador',
    'Programador',
    'Nómina'
  ),
  obtenerProgramacionesPorEmpleado
);



//LISTAR PROGRAMACIONES
//Administrador, Programador y Nómina


router.get(
  '/',
  verificarToken,
  verificarRol(
    'Administrador',
    'Programador',
    'Nómina'
  ),
  listarProgramaciones
);

//OBTENER UNA PROGRAMACIÓN
//Administrador, Programador y Nómina

router.get(
  '/:id',
  verificarToken,
  verificarRol(
    'Administrador',
    'Programador',
    'Nómina'
  ),
  obtenerProgramacion
);



//ACTUALIZAR PROGRAMACIÓN
//Administrador y Programador


router.put(
  '/:id',
  verificarToken,
  verificarRol('Administrador', 'Programador'),
  actualizarProgramacion
);



//CAMBIAR ESTADO
//Administrador y Programador


router.patch(
  '/:id/estado',
  verificarToken,
  verificarRol('Administrador', 'Programador'),
  cambiarEstadoProgramacion
);


export default router;