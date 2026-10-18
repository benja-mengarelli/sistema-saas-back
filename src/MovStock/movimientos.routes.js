import { Router } from 'express';
import { requireAuth, requireEmpresa, requireRole } from '../middlewares/auth.js';
import { postAjusteStock, obtenerMovimiento, listarMovimientos } from './movimientos.controller.js';


const router = Router();

router.post('/:empresaId/ajuste', requireAuth, requireEmpresa(), requireRole(['admin']), postAjusteStock);
router.get('/:empresaId', requireAuth, requireEmpresa(), listarMovimientos);
router.get('/:empresaId/:movimientoId', requireAuth, requireEmpresa(), obtenerMovimiento);

export default router;