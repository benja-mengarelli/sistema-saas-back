import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, filterProducts } from "./product.controller.js";
import { requireAuth, requireRole, requireEmpresa } from '../middlewares/auth.js';

const router = Router();

router.get(
    '/:empresaId', 
    requireAuth,
    requireEmpresa,
    getProducts
);

router.get(
    '/:empresaId/:pid', 
    requireAuth,
    requireEmpresa, 
    getProductById
);

router.post(
    '/:empresaId', 
    requireAuth,
    requireEmpresa, 
    requireRole(['admin']), 
    createProduct
);

router.put(
    '/:empresaId/:pid', 
    requireAuth,
    requireEmpresa, 
    updateProduct
);

router.delete(
    '/:empresaId/:pid', 
    requireAuth,
    requireEmpresa, 
    requireRole(['admin']), 
    deleteProduct
);



export default router;