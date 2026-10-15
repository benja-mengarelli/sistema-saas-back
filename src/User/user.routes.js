import { Router } from 'express';
import { requireAuth, requireRole, requireEmpresa } from '../middlewares/auth.js';
import { mostrarEmpresasController } from './user.controller.js';


const router = Router();

router.get("/empresas",
    requireAuth,
    mostrarEmpresasController
)

export default router;
