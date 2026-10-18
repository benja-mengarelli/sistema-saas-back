import { ajustarStockConteo } from './movimientosStock.service.js'; 
import { responderError } from '../utils/errores.js';

export const postAjusteStock = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const resultado = await ajustarStockConteo(empresaId, req.body?.conteos);
        res.status(resultado.movimientoId ? 201 : 200).json(resultado);
    } catch (error) {
        responderError(res, error);
    }
};