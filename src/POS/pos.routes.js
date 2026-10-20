import { Router } from "express";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";
import { getCajaActual, postAbrirCaja, postCerrarCaja, postVenta } from "../Caja/caja.controller.js";
import { getCuentasCorrientes, getCuentaCorriente, postCargoCC, postPagoCC, postFinalizarCC } from "../CtaCorriente/cuentaCorriente.controller.js";


const router = Router();

router.post('/:empresaId/ventas', requireAuth, requireEmpresa(), postVenta);
router.get('/:empresaId/caja', requireAuth, requireEmpresa(), getCajaActual);
router.post('/:empresaId/caja/abrir', requireAuth, requireEmpresa(), postAbrirCaja);
router.post('/:empresaId/caja/cerrar', requireAuth, requireEmpresa(), postCerrarCaja);
router.get('/:empresaId/cuentas-corrientes', requireAuth, requireEmpresa(), getCuentasCorrientes);
router.get('/:empresaId/cuentas-corrientes/:cuentaId', requireAuth, requireEmpresa(), getCuentaCorriente);
router.post('/:empresaId/cuentas-corrientes/cargos', requireAuth, requireEmpresa(), postCargoCC);
router.post('/:empresaId/cuentas-corrientes/:cuentaId/pagos', requireAuth, requireEmpresa(), postPagoCC);
router.post('/:empresaId/cuentas-corrientes/:cuentaId/finalizar', requireAuth, requireEmpresa(), postFinalizarCC);


export default router;