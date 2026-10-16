import * as productService from './product.service.js';
import { responderError } from '../utils/errores.js';

export const getProducts = async (req, res) => {
    try {
        const { empresaId } = req.params;
        res.json(await productService.getProducts(empresaId, req.query.q));
    } catch (error) { responderError(res, error); }
};

export const getProductById = async (req, res) => {
    try {
        const { empresaId, pid } = req.params;
        res.json(await productService.getProductById(empresaId, pid));
    } catch (error) { responderError(res, error); }
};

export const createProduct = async (req, res) => {
    try {
        const { empresaId } = req.params;
        res.status(201).json(await productService.createProduct(empresaId, req.body));
    } catch (error) { responderError(res, error); }
};

export const updateProduct = async (req, res) => {
    try {
        const { empresaId, pid } = req.params;
        res.json(await productService.updateProduct(empresaId, pid, req.body));
    } catch (error) { responderError(res, error); }
};

export const deleteProduct = async (req, res) => {
    try {
        const { empresaId, pid } = req.params;
        res.json(await productService.deleteProduct(empresaId, pid));
    } catch (error) { responderError(res, error); }
};

export const filterProducts = async (req, res) => {
    try {
        const filteredProducts = await productService.filterProducts(req.query);

        res.json(filteredProducts);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
