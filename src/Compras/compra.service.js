import Product from "../Productos/productModel.js";
import Compra from "./compraModel.js";

export function construirLineasCompra(items) {
    // items: [{ producto, cantidad, costoUnitario }]
    let total = 0;
    const lineas = items.map(item => {
        const subtotal = item.cantidad * item.costoUnitario;
        total += subtotal;
        return { producto: item.producto, cantidad: item.cantidad, costoUnitario: item.costoUnitario, subtotal };
    });
    return { lineas, total };
}

export async function validarProductosCompra(items, session) {
    const ids = items.map(i => i.producto);
    const productos = await Product.find({ _id: { $in: ids } }).session(session);
    const porId = new Map(productos.map(p => [p._id.toString(), p]));

    for (const item of items) {
        const prod = porId.get(item.producto.toString());
        if (!prod) throw new Error(`Producto ${item.producto} no encontrado`);
        if (prod.tipo === "COMBO") throw new Error(`No se puede comprar un combo (${prod.nombre}) directamente`);
        if (!prod.stockeable) throw new Error(`El producto ${prod.nombre} no es stockeable`);
    }
    return porId;
}

export async function crearDocumentoCompra(data, session) {
    const [compra] = await Compra.create([data], { session });
    return compra;
}

export async function actualizarPrecioCompra(items, session) {
    for (const item of items) {
        if (item.actualizarPrecioCompra) {
            await Product.updateOne(
                { _id: item.producto },
                { $set: { precioCompra: item.costoUnitario } },
                { session }
            );
        }
    }
}