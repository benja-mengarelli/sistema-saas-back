import { procesarCompra } from '../POS/pos.service.js'; // ajustar
import { getCompras, getCompraById } from './compra.service.js';
import { responderError } from '../utils/errores.js';

export const postCompra = async (req, res) => {
    try {
        res.status(201).json(await procesarCompra(req.params.empresaId, req.body));
    } catch (error) { responderError(res, error); }
};

export const listarCompras = async (req, res) => {
    try {
        res.json(await getCompras(req.params.empresaId, req.query.dias));
    } catch (error) { responderError(res, error); }
};

export const obtenerCompra = async (req, res) => {
    try {
        const { empresaId, compraId } = req.params;
        res.json(await getCompraById(empresaId, compraId));
    } catch (error) { responderError(res, error); }
};