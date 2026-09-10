import { Router } from "express";
import { procesarVentaPOS } from "./pos.controller.js";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";

const router = Router();

router.post("/:empresaId/sale", requireAuth, requireEmpresa(), procesarVentaPOS);

export default router;