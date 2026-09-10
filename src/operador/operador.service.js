import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../firebase.js";

const JWT_SECRET = process.env.JWT_OPERADOR_SECRET;
const JWT_EXPIRA_SEGUNDOS = Number(process.env.JWT_OPERADOR_EXPIRA_SEGUNDOS) || 300; // 5 minutos

export default async function validarCodigo(empresaId, codigo) {
    const codigosRef = db
        .collection("empresas")
        .doc(empresaId)
        .collection("codigosOperador");

    const snap = await codigosRef.where("activo", "==", true).get();

    for (const doc of snap.docs) {
        const data = doc.data();
        const coincide = await bcrypt.compare(codigo, data.codigoHash);
        if (coincide) {
            const token = jwt.sign(
                { empresaId, codigoId: doc.id, nombre: data.nombre, rol: data.rol },
                JWT_SECRET,
                { expiresIn: `${JWT_EXPIRA_SEGUNDOS}s` }
            );
            return {
                token,
                nombre: data.nombre,
                rol: data.rol,
                codigoId: doc.id,
                expiraEnSegundos: JWT_EXPIRA_SEGUNDOS,
            };
        }
    }

    return null;
}