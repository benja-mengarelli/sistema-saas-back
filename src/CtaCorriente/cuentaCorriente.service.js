import CuentaCorriente from "./CuentaCorrienteModel.js";
import Venta from "../Ventas/ventaModel.js";
import { errorHttp } from "../utils/errores.js";

const ABIERTAS = ['ABIERTA', 'PARCIAL'];
const redondear2 = (n) => Math.round(n * 100) / 100;

export function recalcularCC(cc) {
    cc.totalCargos = redondear2(cc.cargos.reduce((s, c) => s + c.monto, 0));
    cc.totalPagado = redondear2(cc.pagos.reduce((s, p) => s + p.monto, 0));
    cc.saldo = redondear2(cc.totalCargos - cc.totalPagado);
    if (ABIERTAS.includes(cc.estado)) cc.estado = cc.totalPagado > 0 ? 'PARCIAL' : 'ABIERTA';
    return cc;
}

export async function obtenerCCAbierta(empresaId, cuentaId, session) {
    const cc = await CuentaCorriente.findOne({ _id: cuentaId, empresaId, estado: { $in: ABIERTAS } }).session(session);
    if (!cc) throw errorHttp(404, 'La cuenta corriente no existe o ya fue finalizada');
    return cc;
}

export async function obtenerCCPorId(empresaId, cuentaId) {
    return CuentaCorriente.findOne({ _id: cuentaId, empresaId }).lean();
}

export async function crearCC(empresaId, cliente, session) {
    const [cc] = await CuentaCorriente.create([{ empresaId, cliente }], { session });
    return cc;
}

export async function agregarCargo(cc, ventaId, monto, session) {
    cc.cargos.push({ ventaId, monto });
    recalcularCC(cc);
    return cc.save({ session });
}

export async function agregarPago(cc, pago, session) {
    cc.pagos.push(pago);
    recalcularCC(cc);
    return cc.save({ session });
}

export async function ventasDeCargos(empresaId, cc, session) {
    return Venta.find({ empresaId, _id: { $in: cc.cargos.map((c) => c.ventaId) } }).session(session);
}

// junta las líneas de todos los cargos en una sola lista redondear2
export function unificarProductos(ventas) {
    const mapa = new Map();
    for (const v of ventas) {
        for (const p of v.productos) {
            const k = String(p.producto);
            const u = mapa.get(k) ?? { producto: p.producto, tipo: p.tipo, nombre: p.nombre, cantidad: 0, subtotal: 0 };
            u.cantidad += p.cantidad;
            u.subtotal = redondear2(u.subtotal + p.subtotal);
            mapa.set(k, u);
        }
    }
    return [...mapa.values()];
}

export async function liquidarVentas(ids, session) {
    await Venta.updateMany({ _id: { $in: ids } }, { $set: { estado: 'LIQUIDADO' } }, { session });
}

export async function cerrarCC(cc, ventaFinalId, session) {
    cc.estado = 'SALDADA';
    cc.ventaFinalId = ventaFinalId;
    cc.saldo = 0; // si hubo redondeo, la diferencia quedó como descuento/recargo en la venta
    return cc.save({ session });
}

export async function listarCCAbiertas(empresaId) {
    return CuentaCorriente.find({ empresaId, estado: { $in: ABIERTAS } })
        .select('cliente totalCargos totalPagado saldo estado updatedAt')
        .sort({ updatedAt: -1 })
        .lean();
}

export async function detalleCC(empresaId, cuentaId) {
    const cc = await CuentaCorriente.findOne({ _id: cuentaId, empresaId }).lean();
    if (!cc) throw errorHttp(404, 'Cuenta corriente inexistente');
    const ventas = await Venta.find({ empresaId, _id: { $in: cc.cargos.map((c) => c.ventaId) } })
        .select('productos total createdAt')
        .lean();
    return { ...cc, ventas };
}
