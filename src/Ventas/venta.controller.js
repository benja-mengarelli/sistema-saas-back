import { manejar } from "../helper/manejar.js"
import { anularVenta, ventasDeCajaAbierta, ventasDeCaja } from "../POS/pos.service.js";

export const getVentas = manejar(async (req, res) =>
    res.json(await ventasDeCajaAbierta(req.params.empresaId)));

export const getVentasCaja = manejar(async (req, res) =>
    res.json(await ventasDeCaja(req.params.empresaId, req.params.cajaId)))

export const postAnularVenta = manejar(async (req, res) =>
    res.json(await anularVenta(req.params.empresaId, req.params.ventaId, req.user.uid)));