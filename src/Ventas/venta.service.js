import Venta from "./ventaModel.js";
import Product from "../Productos/productModel.js";
import { errorHttp } from "../utils/errores.js"

const redondear2 = (n) => Math.round(n * 100) / 100;
const aCentavos = (n) => Math.round(n * 100);
const deCentavos = (c) => c / 100;

export async function obtenerVentaPorId(empresaId, ventaId, session) {
    return Venta.findOne({ _id: ventaId, empresaId }).session(session ?? null);
}

// Atómica: solo anula si sigue COMPLETADO y no es de cuenta corriente
export async function marcarVentaAnulada(empresaId, ventaId, anuladaPor, session) {
    return Venta.findOneAndUpdate(
        { _id: ventaId, empresaId, estado: 'COMPLETADO', cuentaCorrienteId: null },
        { $set: { estado: 'ANULADO', anulacion: { fecha: new Date(), por: anuladaPor } } },
        { session, returnDocument: 'after' }
    );
}

export async function listarVentasDeCaja(empresaId, cajaId) {
    return Venta.find({ empresaId, cajaId, estado: { $in: ['COMPLETADO', 'ANULADO'] } })
        .select('cliente productos pagos total vuelto descuento recargo estado cuentaCorrienteId createdAt')
        .sort({ createdAt: -1 })
        .lean();
}

export const buscarVentaPorClave = (empresaId, claveIdempotencia) =>
    Venta.findOne({ empresaId, claveIdempotencia });

// Los precios salen siempre de la base, nunca del cliente
export async function construirLineasVenta(empresaId, items, session) {
    const ids = items.map((i) => i.producto);
    const productos = await Product
        .find({ _id: { $in: ids }, empresaId, activo: { $ne: false } })
        .session(session);
    const porId = new Map(productos.map((p) => [p._id.toString(), p]));

    let subtotalGeneral = 0;
    const lineas = items.map((item) => {
        const prod = porId.get(String(item.producto));
        if (!prod) throw errorHttp(404, `Producto ${item.producto} no encontrado`);
        const subtotal = redondear2(prod.precioVenta * item.cantidad);
        subtotalGeneral += subtotal;
        return { producto: prod._id, tipo: prod.tipo, nombre: prod.nombre, cantidad: item.cantidad, subtotal };
    });

    return { lineas, subtotalGeneral: redondear2(subtotalGeneral) };
}

// pagos = lo que entregó el cliente. El vuelto solo puede salir del efectivo.
// montoACobrar (opcional) permite redondear: la diferencia con el subtotal es descuento o recargo.
export function calcularCobro({ subtotal, montoACobrar, pagos }) {
    const subtotalC = aCentavos(subtotal);
    const totalC = montoACobrar == null ? subtotalC : aCentavos(montoACobrar);
    if (!(totalC > 0)) throw errorHttp(400, 'El monto a cobrar debe ser mayor a 0');

    const diferenciaC = totalC - subtotalC; // + recargo, - descuento

    const porTipo = new Map();
    for (const p of pagos) porTipo.set(p.tipoPago, (porTipo.get(p.tipoPago) || 0) + aCentavos(p.monto));

    const entregadoC = [...porTipo.values()].reduce((s, v) => s + v, 0);
    const efectivoC = porTipo.get('EFECTIVO') || 0;

    if (entregadoC < totalC) {
        throw errorHttp(400, `Los pagos no cubren el total (faltan ${deCentavos(totalC - entregadoC)})`);
    }
    const excesoC = entregadoC - totalC;
    if (excesoC > efectivoC) throw errorHttp(400, 'El vuelto solo puede salir de lo pagado en efectivo');
    if (excesoC > 0) porTipo.set('EFECTIVO', efectivoC - excesoC);

    return {
        total: deCentavos(totalC),
        descuento: diferenciaC < 0 ? deCentavos(-diferenciaC) : 0,
        recargo: diferenciaC > 0 ? deCentavos(diferenciaC) : 0,
        pagos: [...porTipo.entries()]
            .filter(([, c]) => c > 0)
            .map(([tipoPago, c]) => ({ tipoPago, monto: deCentavos(c) })),
        vuelto: deCentavos(excesoC),
    };
}

// Reparte el total realmente cobrado entre las líneas, para que la facturación
// por tipo sume lo mismo que los pagos aunque haya redondeo
export function lineasParaFacturar(lineas, total) {
    const base = lineas.reduce((s, l) => s + l.subtotal, 0);
    let acumulado = 0;
    return lineas.map((l, i) => {
        const parte = i === lineas.length - 1
            ? redondear2(total - acumulado)
            : redondear2(base > 0 ? (l.subtotal * total) / base : 0);
        acumulado += parte;
        return { tipo: l.tipo, subtotal: parte };
    });
}

export async function crearDocumentoVenta(data, session) {
    const [venta] = await Venta.create([data], { session });
    return venta;
}
