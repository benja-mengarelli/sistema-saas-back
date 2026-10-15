
import postValidarCodigo from "./operador.controller.js";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";
import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = express.Router({ mergeParams: true });

const limitarIntentos = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        `${req.params.empresaId}:${ipKeyGenerator(req.ip)}`,
    message: { mensaje: "Demasiados intentos, esperá un minuto" },
});

router.post(
    "/validar-codigo",
    requireAuth,
    requireEmpresa(),
    limitarIntentos,
    postValidarCodigo
);

export default router;