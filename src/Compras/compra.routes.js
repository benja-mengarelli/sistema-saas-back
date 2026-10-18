import { Router } from 'express';
import { requireAuth, requireEmpresa, requireRole } from '../middlewares/auth.js';
import { postCompra, listarCompras, obtenerCompra } from './compra.controller.js';

const router = Router();

router.get('/:empresaId', requireAuth, requireEmpresa(), listarCompras);
router.get('/:empresaId/:compraId', requireAuth, requireEmpresa(), obtenerCompra);
router.post('/:empresaId', requireAuth, requireEmpresa(), requireRole(['admin']), postCompra);

export default router;