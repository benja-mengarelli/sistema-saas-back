import * as productService from '../../services/product.service.js';

export const getProducts = async (req, res) => {
    try {
        const { empresaId } = req.params
        const products = await productService.getProducts(empresaId);

        res.json(products);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { empresaId, pid} = req.params
        const product = await productService.getProductById(empresaId, pid);

        res.json(product);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createProduct = async (req, res) => {
    try {
        const { empresaId } = req.params
        const newProduct = await productService.createProduct(empresaId, req.body);

        res.status(201).json(newProduct);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { empresaId, pid} = req.params
        const updatedProduct = await productService.updateProduct(empresaId, pid, req.body);

        res.json(updatedProduct);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { empresaId, pid} = req.params
        const deletedProduct = await productService.deleteProduct(empresaId, pid);

        res.json(deletedProduct);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const filterProducts = async (req, res) => {
    try {
        const filteredProducts = await productService.filterProducts(req.query);

        res.json(filteredProducts);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
