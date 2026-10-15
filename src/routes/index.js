import { Router } from "express";
import productsRouter from "../Productos/products.routes.js";
import userRouter from "../User/user.routes.js";
import loginRouter from "../Login/login.routes.js";
import posRouter from "../POS/pos.routes.js";
import operadorRouter from "../operador/operador.routes.js";

const router = Router();

router.use("api/products", productsRouter);
router.use("api/user", userRouter);
router.use("api/pos", posRouter);
router.use("api/login", loginRouter);
router.use("api/empresas/:empresaId/operadores", operadorRouter);

export default router;
