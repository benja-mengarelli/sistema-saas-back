import Product from "../Productos/productModel.js";

export async function explotarItems(items, session) {
    const ids = items.map(i => i.producto);
    const productos = await Product.find({ _id: { $in: ids } }).session(session);
    const porId = new Map(productos.map(p => [p._id.toString(), p]));

    const acumulado = new Map();

    for (const item of items) {
        const prod = porId.get(item.producto.toString());
        if (!prod) throw new Error(`Producto ${item.producto} no encontrado`);

        if (prod.tipo === "COMBO") {
            for (const comp of prod.productos) {
                const compProd = await Product.findById(comp.producto).session(session);
                if (!compProd?.stockeable) continue;
                const cantidadReal = comp.cantidad * item.cantidad;
                const key = comp.producto.toString();
                acumulado.set(key, (acumulado.get(key) || 0) + cantidadReal);
            }
        } else if (prod.stockeable) {
            const key = prod._id.toString();
            acumulado.set(key, (acumulado.get(key) || 0) + item.cantidad);
        }
        // servicios/alquileres: no mueven stock, se ignoran acá
    }

    return Array.from(acumulado, ([producto, cantidad]) => ({ producto, cantidad }));
}