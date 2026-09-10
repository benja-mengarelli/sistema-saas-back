import express from "express";
import rateLimit from "express-rate-limit";
import postValidarCodigo from "./operador.controller.js";
import { requireAuth, requireEmpresa } from "../middlewares/auth.js";

const router = express.Router({mergeParams: true}); // mergeParams para poder acceder a :empresaId de la ruta padre

const limitarIntentos = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => `${req.params.empresaId}:${req.ip}`,
    message: { mensaje: "Demasiados intentos, esperá un minuto" },
});

router.post(
    "/validar-codigo",
    requireAuth,      // el admin ya logueado
    requireEmpresa(),  // que ese admin sea dueño de :empresaId
    limitarIntentos,
    postValidarCodigo
);

export default router;