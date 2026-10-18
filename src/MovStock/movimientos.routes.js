import { Router } from 'express';
import { requireAuth, requireEmpresa, requireRole } from '../middlewares/auth.js';
import { postAjusteStock } from './movimientos.controller.js';

const router = Router();

router.post('/:empresaId/ajuste', requireAuth, requireEmpresa(), requireRole(['admin']), postAjusteStock);

export default router;