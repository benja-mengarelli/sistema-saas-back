import { Router } from "express";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";
import { getCajaActual, postAbrirCaja, postCerrarCaja, postVenta, getCajas, getDetalleCaja } from "../Caja/caja.controller.js";
import { getCuentasCorrientes, getCuentaCorriente, postCargoCC, postPagoCC, postFinalizarCC } from "../CtaCorriente/cuentaCorriente.controller.js";
import { getVentas, postAnularVenta, getVentasCaja } from "../Ventas/venta.controller.js";


const router = Router();

router.get('/:empresaId/caja', requireAuth, requireEmpresa(), getCajaActual);
router.post('/:empresaId/caja/abrir', requireAuth, requireEmpresa(), postAbrirCaja);
router.post('/:empresaId/caja/cerrar', requireAuth, requireEmpresa(), postCerrarCaja);
router.get('/:empresaId/cajas', requireAuth, requireEmpresa(), getCajas);
router.get('/:empresaId/cajas/:cajaId', requireAuth, requireEmpresa(), getDetalleCaja);

router.get('/:empresaId/cuentas-corrientes', requireAuth, requireEmpresa(), getCuentasCorrientes);
router.get('/:empresaId/cuentas-corrientes/:cuentaId', requireAuth, requireEmpresa(), getCuentaCorriente);
router.post('/:empresaId/cuentas-corrientes/cargos', requireAuth, requireEmpresa(), postCargoCC);
router.post('/:empresaId/cuentas-corrientes/:cuentaId/pagos', requireAuth, requireEmpresa(), postPagoCC);
router.post('/:empresaId/cuentas-corrientes/:cuentaId/finalizar', requireAuth, requireEmpresa(), postFinalizarCC);


router.get('/:empresaId/ventas', requireAuth, requireEmpresa(), getVentas);
router.get('/:empresaId/ventas/:cajaId', requireAuth, requireEmpresa(), getVentasCaja);
router.post('/:empresaId/ventas', requireAuth, requireEmpresa(), postVenta);
router.post('/:empresaId/ventas/:ventaId/anular', requireAuth, requireEmpresa(), postAnularVenta);



export default router;