import { ajustarStockConteo } from './movimientoStock.service.js'; 
import { responderError } from '../utils/errores.js';
import { getMovimientosStock, getMovimientoStockById } from './movimientoStock.service.js'; // ajustar

export const listarMovimientos = async (req, res) => {
    try {
        res.json(await getMovimientosStock(req.params.empresaId, req.query.dias));
    } catch (error) { responderError(res, error); }
};

export const obtenerMovimiento = async (req, res) => {
    try {
        const { empresaId, movimientoId } = req.params;
        res.json(await getMovimientoStockById(empresaId, movimientoId));
    } catch (error) { responderError(res, error); }
};

export const postAjusteStock = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const resultado = await ajustarStockConteo(empresaId, req.body?.conteos);
        res.status(resultado.movimientoId ? 201 : 200).json(resultado);
    } catch (error) {
        responderError(res, error);
    }
};