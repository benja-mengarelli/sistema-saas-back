import { getCajas, getDetalleCaja } from "./caja.controller";

router.get('/:empresaId/cajas',          requireAuth, requireEmpresa(), getCajas);
router.get('/:empresaId/cajas/:cajaId',  requireAuth, requireEmpresa(), getDetalleCaja);