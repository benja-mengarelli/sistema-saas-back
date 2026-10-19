import { obtenerCajaAbierta, calcularResumen, abrirCaja } from './caja.service.js'; 
import { cerrarCajaPOS } from '../POS/pos.service.js';
import { responderError } from '../utils/errores.js';

export const getCajaActual = async (req, res) => {
    try {
        const caja = await obtenerCajaAbierta(req.params.empresaId);
        res.json(caja ? { caja, resumen: calcularResumen(caja) } : { caja: null, resumen: null });
    } catch (error) { responderError(res, error); }
};

export const postAbrirCaja = async (req, res) => {
    try {
        const caja = await abrirCaja({
            empresaId: req.params.empresaId,
            efectivoInicial: req.body?.efectivoInicial,
            abiertaPor: req.user.uid, // luego pasa a ser el operador
        });
        res.status(201).json({ caja, resumen: calcularResumen(caja) });
    } catch (error) { responderError(res, error); }
};

export const postCerrarCaja = async (req, res) => {
    try {
        res.json(await cerrarCajaPOS(req.params.empresaId, {
            efectivoContado: req.body?.efectivoContado,
            cerradaPor: req.user.uid,
        }));
    } catch (error) { responderError(res, error); }
};