import * as posService from "./pos.service.js";

export const procesarVentaPOS = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const venta = await posService.procesarVentaPOS(empresaId, req.body);
        res.status(201).json(venta);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};