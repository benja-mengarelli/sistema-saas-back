import { Router } from "express";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";
import { getCajaActual, postAbrirCaja, postCerrarCaja, postVenta } from "../Caja/caja.controller.js";

const router = Router();

router.post('/:empresaId/ventas', requireAuth, requireEmpresa(), postVenta);
router.get('/:empresaId/caja', requireAuth, requireEmpresa(), getCajaActual);
router.post('/:empresaId/caja/abrir', requireAuth, requireEmpresa(), postAbrirCaja);
router.post('/:empresaId/caja/cerrar', requireAuth, requireEmpresa(), postCerrarCaja);

export default router;