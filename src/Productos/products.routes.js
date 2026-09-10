import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, filterProducts } from "./product.controller.js";
import { requireAuth, requireRole, requireEmpresa } from '../middlewares/auth.js';
import passport from '../../config/passport.config.js';

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

//! filtrar en front
/* router.get(
    '/filter', 
    passport.authenticate('jwt', { session: false }), 
    filterProducts
); */

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