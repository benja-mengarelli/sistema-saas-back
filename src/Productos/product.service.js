import mongoose from 'mongoose';
import Product from './productModel.js';
import FamiliaProductos from './familia_productosModel.js';
import { errorHttp } from '../utils/errores.js';
import { explotarItems } from '../helper/explotarProductos.js';

const ACTIVO = { $ne: false }; // incluye docs viejos que no tienen el campo
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const modeloPorTipo = (tipo) => (tipo === 'COMBO' ? FamiliaProductos : Product);

const sanitizar = (data = {}, extra = []) => {
    const copia = { ...data };
    for (const k of ['_id', 'empresaId', 'activo', 'eliminadoEn', 'createdAt', 'updatedAt', ...extra]) {
        delete copia[k];
    }
    return copia;
};

const validarId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw errorHttp(400, 'Id inválido');
};

// Componentes de un combo: existen, son de la empresa, están activos y no son combos
async function validarComponentes(empresaId, componentes) {
    if (!Array.isArray(componentes) || componentes.length === 0) {
        throw errorHttp(400, 'El combo necesita al menos un producto');
    }
    const ids = componentes.map((c) => c.producto);
    ids.forEach(validarId);
    if (new Set(ids.map(String)).size !== ids.length) {
        throw errorHttp(400, 'Hay productos repetidos en el combo');
    }
    if (componentes.some((c) => !(Number(c.cantidad) > 0))) {
        throw errorHttp(400, 'Cada cantidad debe ser mayor a 0');
    }
    const encontrados = await Product.countDocuments({
        _id: { $in: ids }, empresaId, activo: ACTIVO, tipo: { $ne: 'COMBO' },
    });
    if (encontrados !== ids.length) {
        throw errorHttp(400, 'Algún producto del combo no existe, está eliminado o es otro combo');
    }
}

export const getProducts = async (empresaId, q) => {
    const filtro = { empresaId, activo: ACTIVO };
    if (typeof q === 'string' && q.trim()) {
        filtro.nombre = { $regex: escapar(q.trim()), $options: 'i' };
    }
    return Product.find(filtro).sort({ nombre: 1 });
};

export const getProductById = async (empresaId, pid) => {
    validarId(pid);
    const product = await Product.findOne({ _id: pid, empresaId, activo: ACTIVO });
    if (!product) throw errorHttp(404, 'Producto no encontrado');
    return product;
};

export const createProduct = async (empresaId, productData) => {
    const data = sanitizar(productData);

    if (data.tipo === 'COMBO') await validarComponentes(empresaId, data.productos);
    if (data.tipo === 'SERVICIO') { data.stockeable = false; data.stock = 0; }

    // new + save a propósito: Product.create({ tipo: 'PRODUCTO' }) puede fallar con
    // "Discriminator not found" porque solo COMBO está registrado como discriminator.
    const Modelo = modeloPorTipo(data.tipo);
    const nuevo = new Modelo({ ...data, empresaId });
    await nuevo.save();
    return nuevo;
};

export const updateProduct = async (empresaId, pid, productData) => {
    validarId(pid);
    const existente = await Product.findOne({ _id: pid, empresaId, activo: ACTIVO }).select('tipo');
    if (!existente) throw errorHttp(404, 'Producto no encontrado');

    // tipo y stock no se editan por acá: el stock solo se mueve con movimientos
    const cambios = sanitizar(productData, ['tipo', 'stock']);
    if (existente.tipo === 'COMBO' && cambios.productos !== undefined) {
        await validarComponentes(empresaId, cambios.productos);
    }

    const Modelo = modeloPorTipo(existente.tipo);
    return Modelo.findOneAndUpdate(
        { _id: pid, empresaId },
        { $set: cambios },
        { new: true, runValidators: true }
    );
};

// Borrado lógico. No deja eliminar un producto que forma parte de un combo activo.
export const deleteProduct = async (empresaId, pid) => {
    validarId(pid);

    const enCombo = await FamiliaProductos
        .findOne({ empresaId, activo: ACTIVO, 'productos.producto': pid })
        .select('nombre');
    if (enCombo) {
        throw errorHttp(409, `No se puede eliminar: forma parte del combo "${enCombo.nombre}"`);
    }

    const eliminado = await Product.findOneAndUpdate(
        { _id: pid, empresaId, activo: ACTIVO },
        { $set: { activo: false, eliminadoEn: new Date() } },
        { new: true }
    );
    if (!eliminado) throw errorHttp(404, 'Producto no encontrado');
    return eliminado;
};

export async function descontarStockVenta(items, session) {
    const explotados = await explotarItems(items, session);

    for (const { producto, cantidad } of explotados) {
        const actualizado = await Product.findOneAndUpdate(
            { _id: producto, stock: { $gte: cantidad } },
            { $inc: { stock: -cantidad } },
            { session, returnDocument: 'after' }
        );
        if (!actualizado) {
            const p = await Product.findById(producto).select('nombre stock').session(session);
            throw errorHttp(409, `Stock insuficiente: ${p?.nombre ?? producto} (disponible ${p?.stock ?? 0})`);
        }
    }
    return explotados;
}

export async function reponerStockVenta(items, session) {
    const explotados = await explotarItems(items, session);
    for (const { producto, cantidad } of explotados) {
        await Product.updateOne({ _id: producto }, { $inc: { stock: cantidad } }, { session });
    }
    return explotados;
}