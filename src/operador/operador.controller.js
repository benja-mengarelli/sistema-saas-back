import validarCodigo from "./operador.service.js";

export default async function postValidarCodigo(req, res) {
    const { empresaId } = req.params;
    const { codigo } = req.body;

    if (!codigo || typeof codigo !== "string") {
        return res.status(400).json({ mensaje: "Código requerido" });
    }

    const resultado = await validarCodigo(empresaId, codigo.trim());

    if (!resultado) {
        return res.status(401).json({ mensaje: "Código inválido" });
    }

    res.json(resultado); // { token, nombre, rol, codigoId, expiraEnSegundos }
}
