import mongoose from "mongoose";
import MovimientoStock from "./movimientoStockModel.js";
import Product from "../Productos/productModel.js";
import { explotarItems } from "../helper/explotarProductos.js";
import Venta from "../Ventas/ventaModel.js";
import { errorHttp } from '../utils/errores.js';
import { conTransaccion } from '../utils/transaccion.js';


const DIA_MS = 24 * 60 * 60 * 1000;

// Ventana móvil: ahora menos N días (por defecto 15, tope 90)
export const getMovimientosStock = async (empresaId, dias) => {
    const n = Math.min(Math.max(parseInt(dias, 10) || 15, 1), 90);
    const desde = new Date(Date.now() - n * DIA_MS);

    return MovimientoStock.aggregate([
        { $match: { empresaId, createdAt: { $gte: desde } } },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                tipo: 1,
                origen: 1,
                createdAt: 1,
                cantidadProductos: { $size: { $ifNull: ['$productos', []] } },
            },
        },
    ]);
};

export const getMovimientoStockById = async (empresaId, movimientoId) => {
    if (!mongoose.isValidObjectId(movimientoId)) throw errorHttp(400, 'Id inválido');

    const mov = await MovimientoStock.findOne({ _id: movimientoId, empresaId })
        .populate('productos.producto', '_id nombre')
        .lean();
    if (!mov) throw errorHttp(404, 'Movimiento no encontrado');
    return mov;
};


/* */
/*
 * signo: 1 = entra stock (COMPRA, DEVOLUCION), -1 = sale stock (MERMA)
 * origen: { tipo, referenciaId }
 */
export async function aplicarMovimiento({ empresaId, items, signo, tipo, origen }, session) {
    const explotados = await explotarItems(items, session);
    const lineas = [];

    for (const { producto, cantidad } of explotados) {
        const delta = signo * cantidad;
        const prod = await Product.findOne({ _id: producto, empresaId }).session(session);
        if (!prod) throw errorHttp(404, `Producto no encontrado: ${producto}`);

        const stockAnterior = prod.stock;
        const stockActual = stockAnterior + delta;
        if (stockActual < 0) {
            throw errorHttp(409, `Stock insuficiente: ${prod.nombre}, disponible ${stockAnterior}`);
        }

        await Product.updateOne({ _id: producto, empresaId }, { $inc: { stock: delta } }, { session });
        lineas.push({ producto, cantidad: delta, stockAnterior, stockActual });
    }

    if (!lineas.length) return null;

    const [mov] = await MovimientoStock.create(
        [{ empresaId, productos: lineas, tipo, origen }],
        { session }
    );
    return mov;
}

export const registrarCompra = (data, session) =>
    aplicarMovimiento({ ...data, signo: 1, tipo: "COMPRA" }, session);

export const registrarMerma = (data, session) =>
    aplicarMovimiento({ ...data, signo: -1, tipo: "MERMA" }, session);

export const registrarDevolucionCliente = (data, session) =>
    aplicarMovimiento({ ...data, signo: 1, tipo: "DEVOLUCION" }, session);

export const registrarDevolucionProveedor = (data, session) =>
    aplicarMovimiento({ ...data, signo: -1, tipo: "DEVOLUCION" }, session);


/*! AJUSTE DE STOCK */
export async function registrarAjuste({ empresaId, conteos, origen = { tipo: 'AJUSTE' } }, session) {
    const ids = conteos.map((c) => c.producto);
    const prods = await Product
        .find({ _id: { $in: ids }, empresaId, activo: { $ne: false } })
        .session(session);
    const porId = new Map(prods.map((p) => [String(p._id), p]));

    const lineas = [];
    const operaciones = [];

    for (const { producto, stockContado } of conteos) {
        const prod = porId.get(String(producto));
        if (!prod) throw errorHttp(404, `Producto no encontrado: ${producto}`);
        if (!prod.stockeable) continue;

        const stockAnterior = prod.stock;
        const delta = stockContado - stockAnterior;
        if (delta === 0) continue;

        operaciones.push({
            updateOne: {
                filter: { _id: prod._id, empresaId },
                update: { $set: { stock: stockContado } },
            },
        });
        lineas.push({ producto: prod._id, cantidad: delta, stockAnterior, stockActual: stockContado });
    }

    if (!lineas.length) return null;

    await Product.bulkWrite(operaciones, { session });

    const [mov] = await MovimientoStock.create(
        [{ empresaId, productos: lineas, tipo: 'AJUSTE', origen }],
        { session }
    );
    return mov;
}

/*! CIERRE DE CAJA */
export async function cerrarVentasDelDia({ empresaId, cajaId }, session) {
    const ventas = await Venta.find({
        empresaId,
        cajaId,
        estado: { $ne: "ANULADO" }
    }).session(session);

    const acumulado = new Map();

    for (const venta of ventas) {
        const items = venta.productos.map(p => ({ producto: p.referencia, cantidad: p.cantidad }));
        const explotados = await explotarItems(items, session);
        for (const { producto, cantidad } of explotados) {
            acumulado.set(producto, (acumulado.get(producto) || 0) + cantidad);
        }
    }

    if (!acumulado.size) return null;

    const lineas = [];
    for (const [producto, cantidadVendida] of acumulado) {
        const prod = await Product.findById(producto).session(session);
        const stockActual = prod.stock; // ya refleja los descuentos en tiempo real
        const stockAnterior = stockActual + cantidadVendida; // reconstruido, no se aplica de nuevo
        lineas.push({ producto, cantidad: -cantidadVendida, stockAnterior, stockActual });
    }

    const [mov] = await MovimientoStock.create(
        [{ empresaId, productos: lineas, tipo: "VENTA", origen: { tipo: "CAJA", referenciaId: cajaId } }],
        { session }
    );
    return mov;
}

function validarConteos(conteos) {
    if (!Array.isArray(conteos) || conteos.length === 0) throw errorHttp(400, 'No hay conteos para guardar');
    if (conteos.length > 1000) throw errorHttp(400, 'Demasiados productos en un solo conteo');

    const vistos = new Set();
    for (const c of conteos) {
        if (!mongoose.isValidObjectId(c?.producto)) throw errorHttp(400, 'Producto inválido');
        if (typeof c.stockContado !== 'number' || !Number.isFinite(c.stockContado) || c.stockContado < 0) {
            throw errorHttp(400, 'El stock contado debe ser un número mayor o igual a 0');
        }
        if (vistos.has(String(c.producto))) throw errorHttp(400, 'Hay un producto repetido en el conteo');
        vistos.add(String(c.producto));
    }
}

export async function ajustarStockConteo(empresaId, conteos) {
    validarConteos(conteos);

    const mov = await conTransaccion((session) =>
        registrarAjuste({ empresaId, conteos, origen: { tipo: 'AJUSTE' } }, session)
    );

    return { ajustados: mov ? mov.productos.length : 0, movimientoId: mov ? mov._id : null };
}