import mongoose from "mongoose";
import MovimientoStock from "./movimientoStockModel.js";
import Product from "../Productos/productModel.js";
import { explotarItems } from "../helper/explotarProductos.js";
import Venta from "../Ventas/ventaModel.js";


export const getMovimientosStock = async (empresaId) => {
    try {
        return await MovimientoStock.find({ empresaId })
            .sort({ createdAt: -1 })
            .populate("productos.producto", "_id nombre");
    } catch (error) {
        console.error("Error al obtener movimientos de stock:", error);
        throw new Error("Error al obtener movimientos de stock");
    }
};

export const getMovimientoStockById = async (empresaId, movimientoId) => {
    try {
        return await MovimientoStock.findOne({ _id: movimientoId, empresaId })
            .populate("productos.producto", "_id nombre");
    } catch (error) {
        console.error("Error al obtener movimiento de stock:", error);
        throw new Error("Error al obtener movimiento de stock");
    }
};

export const deleteMovimientoStock = async (empresaId, movimientoId) => {
    try {
        return await MovimientoStock.findOneAndDelete({ _id: movimientoId, empresaId });
    } catch (error) {
        console.error("Error al eliminar movimiento de stock:", error);
        throw new Error("Error al eliminar movimiento de stock");
    }
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
        const prod = await Product.findById(producto).session(session);
        const stockAnterior = prod.stock;
        const stockActual = stockAnterior + delta;

        if (stockActual < 0) {
            throw new Error(`Stock insuficiente: producto ${producto}, disponible ${stockAnterior}`);
        }

        await Product.updateOne({ _id: producto }, { $inc: { stock: delta } }, { session });
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
export async function registrarAjuste ({ empresaId, conteos, origen }, session) {
    // conteos: [{ producto, stockContado }]
    const lineas = [];

    for (const { producto, stockContado } of conteos) {
        const prod = await Product.findById(producto).session(session);
        if (!prod.stockeable) continue;

        const stockAnterior = prod.stock;
        const delta = stockContado - stockAnterior;
        if (delta === 0) continue;

        await Product.updateOne({ _id: producto }, { $set: { stock: stockContado } }, { session });
        lineas.push({ producto, cantidad: delta, stockAnterior, stockActual: stockContado });
    }

    if (!lineas.length) return null;

    const [mov] = await MovimientoStock.create(
        [{ empresaId, productos: lineas, tipo: "AJUSTE", origen }],
        { session }
    );
    return mov;
}

/*! CIERRE DE CAJA */ 
async function cerrarVentasDelDia({ empresaId, cajaId }, session) {
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