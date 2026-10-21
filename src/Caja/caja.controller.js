import { obtenerCajaAbierta, calcularResumen, abrirCaja, listarCajas, detalleCaja } from './caja.service.js'; 
import { cerrarCajaPOS } from '../POS/pos.service.js';
import { responderError } from '../utils/errores.js';
import { procesarVenta } from '../POS/pos.service.js';
import { manejar } from '../helper/manejar.js';

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
            efectivoEnCaja: req.body?.efectivoEnCaja,
            efectivoRetirado: req.body?.efectivoRetirado,
            cerradaPor: req.user.uid,
        }));
    } catch (error) { responderError(res, error); }
};


export const postVenta = async (req, res) => {
    try {
        const { venta, repetida } = await procesarVenta(req.params.empresaId, req.body);
        res.status(repetida ? 200 : 201).json(venta);
    } catch (error) { responderError(res, error); }
};

export const getCajas = manejar(async (req, res) =>
    res.json(await listarCajas(req.params.empresaId)));

export const getDetalleCaja = manejar(async (req, res) =>
    res.json(await detalleCaja(req.params.empresaId, req.params.cajaId)));