import { Router } from 'express';

import authRoutes from './auth.routes.js';
import empresaRoutes from './empresa.routes.js';
import rolRoutes from './rol.routes.js';
import usuarioRoutes from './usuario.routes.js';
import empleadoRoutes from './empleado.routes.js';
import novedadRoutes from './novedad.routes.js';
import cargoRoutes from './cargo.routes.js';
import turnoRoutes from './turno.routes.js';
import programacionRoutes from './programacion.routes.js';
import nominaRoutes from './nomina.routes.js';
import obraRoutes from './obra.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/empresas', empresaRoutes);
router.use('/roles', rolRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/empleados', empleadoRoutes);
router.use('/novedades', novedadRoutes);
router.use('/cargos', cargoRoutes);
router.use('/turnos', turnoRoutes);
router.use('/programaciones', programacionRoutes);
router.use('/nominas', nominaRoutes);
router.use('/obras', obraRoutes);

export default router;