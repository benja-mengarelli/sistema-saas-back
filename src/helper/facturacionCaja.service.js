import Caja from "../Caja/cajaModel.js";
import { errorHttp } from "../utils/errores.js";

const TIPO_PAGO_TO_CAJA_KEY = { EFECTIVO: "efectivo", TRANSFERENCIA: "transferencia", TARJETA: "tarjeta" };
const TIPO_PRODUCTO_TO_FACTURACION_KEY = { PRODUCTO: "productos", COMBO: "productos", SERVICIO: "servicios", ALQUILER: "alquileres" };

function incFromPagos(pagos) {
    const inc = {};
    for (const p of pagos) {
        const key = TIPO_PAGO_TO_CAJA_KEY[p.tipoPago];
        inc[`pagos.${key}`] = (inc[`pagos.${key}`] || 0) + p.monto;
    }
    return inc;
}

function incFromLineas(lineas) {
    const inc = {};
    for (const l of lineas) {
        const key = TIPO_PRODUCTO_TO_FACTURACION_KEY[l.tipo];
        inc[`facturacion.${key}`] = (inc[`facturacion.${key}`] || 0) + l.subtotal;
    }
    return inc;
}

async function aplicarIncrementos(cajaId, inc, session) {
    if (Object.keys(inc).length === 0) return;
    const r = await Caja.updateOne({ _id: cajaId, estado: "abierta" }, { $inc: inc }, { session });
    if (r.matchedCount === 0) throw errorHttp(409, "La caja ya no está abierta");
}

export async function aplicarFacturacion({ cajaId, pagos, lineas }, session) {
    await aplicarIncrementos(cajaId, { ...incFromPagos(pagos), ...incFromLineas(lineas) }, session);
}

export async function revertirFacturacion({ cajaId, pagos, lineas }, session) {
    const inc = { ...incFromPagos(pagos), ...incFromLineas(lineas) };
    const invertido = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, -v]));
    await aplicarIncrementos(cajaId, invertido, session);
}

export async function obtenerCajaAbierta(cajaId, empresaId, session) {
    const caja = await Caja.findOne({ _id: cajaId, empresaId, estado: "abierta" }).session(session);
    if (!caja) throw new Error("La caja indicada no existe o no está abierta");
    return caja;
}