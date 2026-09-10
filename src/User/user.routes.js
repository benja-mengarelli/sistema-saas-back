import { Router } from 'express';
import { requireAuth, requireRole, requireEmpresa } from '../middlewares/auth.js';
import { mostrarEmpresasController, agregarEmpresaController } from './user.controller.js';


const router = Router();

router.get("/empresas",
    requireAuth,
    mostrarEmpresasController
)

router.post("/empresas/agregarEmpresa",
    requireAuth,
    agregarEmpresaController
)
export default router;
