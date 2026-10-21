import { manejar } from "../helper/manejar.js"
import { anularVenta, ventasDeCajaAbierta } from "../POS/pos.service.js";

export const getVentas = manejar(async (req, res) =>
    res.json(await ventasDeCajaAbierta(req.params.empresaId)));

export const postAnularVenta = manejar(async (req, res) =>
    res.json(await anularVenta(req.params.empresaId, req.params.ventaId, req.user.uid)));