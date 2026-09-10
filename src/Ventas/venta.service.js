import Venta from "./ventaModel.js";
import Product from "../Productos/productModel.js";

export const getVentas = async (empresaId) => {
    try {
        return await Venta.find({ empresaId })
            .sort({ createdAt: -1 })
            .populate("cajaId");
    } catch (error) {
        console.error("Error al obtener ventas:", error);
        throw new Error("Error al obtener ventas");
    }
};

export const getVentaById = async (empresaId, ventaId) => {
    try {
        return await Venta.findOne({ _id: ventaId, empresaId }).populate("cajaId");
    } catch (error) {
        console.error("Error al obtener venta:", error);
        throw new Error("Error al obtener venta");
    }
};

export async function construirLineasVenta(items, session) {
    const ids = items.map(i => i.referencia);
    const productos = await Product.find({ _id: { $in: ids } }).session(session);
    const porId = new Map(productos.map(p => [p._id.toString(), p]));

    let subtotalGeneral = 0;
    const lineas = items.map(item => {
        const prod = porId.get(item.referencia.toString());
        if (!prod) throw new Error(`Producto ${item.referencia} no encontrado`);
        const subtotal = prod.precioVenta * item.cantidad;
        subtotalGeneral += subtotal;
        return { referencia: prod._id, tipo: prod.tipo, nombre: prod.nombre, cantidad: item.cantidad, subtotal };
    });

    return { lineas, subtotalGeneral };
}

export function validarPagos(pagos, total) {
    const sumaPagos = pagos.reduce((acc, p) => acc + p.monto, 0);
    if (sumaPagos !== total) {
        throw new Error(`Los pagos (${sumaPagos}) no coinciden con el total (${total})`);
    }
}

export async function crearDocumentoVenta(data, session) {
    const [venta] = await Venta.create([data], { session });
    return venta;
}

export async function marcarVentaAnulada(ventaId, empresaId, session) {
    const venta = await Venta.findOne({ _id: ventaId, empresaId }).session(session);
    if (!venta) throw new Error("Venta no encontrada");
    if (venta.estado === "ANULADO") throw new Error("La venta ya está anulada");
    venta.estado = "ANULADO";
    await venta.save({ session });
    return venta;
}
