import Product from './productModel.js';
import { explotarItems } from './productoHelper.js';

export const getProducts = async (empresaId) => {
    try {
        const products = await Product.find({
            empresaId: empresaId,
            nombre: {
                $regex: q,
                $options: "i"
            }
        }).sort({ nombre: 1 });

        return products;

    } catch (error) {
        console.error('Error al obtener productos:', error);
        throw new Error('Error al obtener productos');
    }
};

export const getProductById = async (empresaId, pid) => {
    try {
        const product = await Product.findOne({ _id: pid, empresaId });
        return product;

    } catch (error) {
        console.error('Error al obtener producto:', error);
        throw new Error('Error al obtener producto');
    }
};

export const createProduct = async (empresaId, productData) => {
    try {
        const newProduct = new Product(empresaId, ...productData);
        await newProduct.save();
        return newProduct;
    } catch (error) {
        console.error('Error al crear producto:', error);
        throw new Error('Error al crear producto');
    }
};


export const updateProduct = async (empresaId, pid, productData) => {
    try {

        const updatedProduct = await Product.findOneAndUpdate(
            { _id: pid, empresaId },
            productData,
            { new: true, runValidators: true }
        );
        return updatedProduct;

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        throw new Error('Error al actualizar producto');
    }
};

export const deleteProduct = async (empresaId, pid) => {
    try {
        const deletedProduct = await Product.findOneAndDelete({ _id: pid, empresaId});
        return deletedProduct;

    } catch (error) {
        console.error('Error al eliminar producto:', error);
        throw new Error('Error al eliminar producto');
    }
};

export async function descontarStockVenta(items, session) {
    const explotados = await explotarItems(items, session);

    for (const { producto, cantidad } of explotados) {
        const actualizado = await Product.findOneAndUpdate(
            { _id: producto, stock: { $gte: cantidad } },
            { $inc: { stock: -cantidad } },
            { session, new: true }
        );
        if (!actualizado) {
            throw new Error(`Stock insuficiente para el producto ${producto}`);
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
