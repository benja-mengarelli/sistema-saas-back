import mongoose from 'mongoose';
import Product from '../Productos/productModel.js';
import Compra from './compraModel.js';
import { errorHttp } from '../utils/errores.js';

const DIA_MS = 24 * 60 * 60 * 1000;
const redondear2 = (n) => Math.round(n * 100) / 100;

export function construirLineasCompra(items) {
    let total = 0;
    const lineas = items.map((item) => {
        const subtotal = redondear2(item.cantidad * item.costoUnitario);
        total += subtotal;
        return {
            producto: item.producto || null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            subtotal,
        };
    });
    return { lineas, total: redondear2(total) };
}

// Solo valida los ítems vinculados a un producto; los ítems libres no tocan el stock
export async function validarProductosCompra(empresaId, items, session) {
    const vinculados = items.filter((i) => i.producto);
    const ids = vinculados.map((i) => i.producto);
    const productos = await Product
        .find({ _id: { $in: ids }, empresaId, activo: { $ne: false } })
        .session(session);
    const porId = new Map(productos.map((p) => [p._id.toString(), p]));

    for (const item of vinculados) {
        const prod = porId.get(item.producto.toString());
        if (!prod) throw errorHttp(404, `Producto ${item.producto} no encontrado`);
        if (prod.tipo === 'COMBO') throw errorHttp(400, `No se puede comprar un combo (${prod.nombre}) directamente`);
        if (!prod.stockeable) throw errorHttp(400, `El producto ${prod.nombre} no es stockeable`);
    }
    return porId;
}

export async function crearDocumentoCompra(data, session) {
    const [compra] = await Compra.create([data], { session });
    return compra;
}

export async function actualizarPrecioCompra(empresaId, items, session) {
    const operaciones = items
        .filter((i) => i.producto && i.actualizarPrecioCompra)
        .map((i) => ({
            updateOne: {
                filter: { _id: i.producto, empresaId },
                update: { $set: { precioCompra: i.costoUnitario } },
            },
        }));
    if (operaciones.length) await Product.bulkWrite(operaciones, { session });
}

export const getCompras = async (empresaId, dias) => {
    const n = Math.min(Math.max(parseInt(dias, 10) || 15, 1), 90);
    const desde = new Date(Date.now() - n * DIA_MS);

    return Compra.aggregate([
        { $match: { empresaId, createdAt: { $gte: desde } } },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                createdAt: 1,
                total: 1,
                estado: 1,
                proveedorNombre: '$proveedor.nombre',
                cantidadItems: { $size: { $ifNull: ['$productos', []] } },
            },
        },
    ]);
};

export const getCompraById = async (empresaId, compraId) => {
    if (!mongoose.isValidObjectId(compraId)) throw errorHttp(400, 'Id inválido');
    const compra = await Compra.findOne({ _id: compraId, empresaId }).lean();
    if (!compra) throw errorHttp(404, 'Compra no encontrada');
    return compra;
};