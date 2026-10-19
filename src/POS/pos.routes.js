import { Router } from "express";
import { procesarVentaPOS } from "./pos.controller.js";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";
import { getCajaActual, postAbrirCaja, postCerrarCaja } from "../Caja/caja.controller.js";

const router = Router();

router.post("/:empresaId/sale", requireAuth, requireEmpresa(), procesarVentaPOS);
router.get('/:empresaId/caja', requireAuth, requireEmpresa(), getCajaActual);
router.post('/:empresaId/caja/abrir', requireAuth, requireEmpresa(), postAbrirCaja);
router.post('/:empresaId/caja/cerrar', requireAuth, requireEmpresa(), postCerrarCaja);

export default router;