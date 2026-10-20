const enviar = (res, r) => res.status(r.repetida || r.repetido ? 200 : 201).json(r);

export const getCuentasCorrientes = async (req, res, next) => {
    try { res.json(await listarCCAbiertas(req.params.empresaId)); } catch (e) { next(e); }
};
export const getCuentaCorriente = async (req, res, next) => {
    try { res.json(await detalleCC(req.params.empresaId, req.params.cuentaId)); } catch (e) { next(e); }
};
export const postCargoCC = async (req, res, next) => {
    try { enviar(res, await procesarCargoCC(req.params.empresaId, req.body)); } catch (e) { next(e); }
};
export const postPagoCC = async (req, res, next) => {
    try { enviar(res, await registrarPagoCC(req.params.empresaId, req.params.cuentaId, req.body)); } catch (e) { next(e); }
};
export const postFinalizarCC = async (req, res, next) => {
    try { enviar(res, await finalizarCC(req.params.empresaId, req.params.cuentaId, req.body)); } catch (e) { next(e); }
};