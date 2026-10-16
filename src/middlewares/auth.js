import { db, auth } from '../config/firebase.config.js';
import jwt from 'jsonwebtoken';

export const requireAuth = async (req, res, next) => {

    try {
        const token = req.headers.authorization?.split(' ')[1]; // Obtener el token del encabezado Authorization

        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }

        let decoded;
        try {
            decoded = await auth.verifyIdToken(token);
        } catch (error) {
            return res.status(401).json({ message: 'Token no válido' });
        }

        req.user = decoded; // Agregar la información del usuario al objeto req

        next();

    } catch (error) {
        return res.status(401).json({ message: 'Token no válido' });
    }
};

export const requireEmpresa = () => {
    return async (req, res, next) => {
        try {
            const { empresaId } = req.params;
            const empresaRef = db.collection('empresas').doc(empresaId);

            const [empresaDoc, miembroDoc] = await Promise.all([
                empresaRef.get(),
                empresaRef.collection('miembros').doc(req.user.uid).get(),
            ]);

            if (!empresaDoc.exists) {
                return res.status(404).json({ message: 'Empresa no encontrada' });
            }
            if (!miembroDoc.exists) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const miembro = { uid: miembroDoc.id, ...miembroDoc.data() };

            if (miembro.activo === false) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            req.miembro = miembro;
            next();
        } catch (error) {
            console.error('Error al verificar empresa:', error);
            return res.status(500).json({ message: 'Error del servidor' });
        }
    };
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.miembro.rol)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }
        next();
    };
};


//! nuevos middles para operadores
export function requireOperador(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ mensaje: "Sesión de operador requerida" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_OPERADOR_SECRET);
        req.operador = payload; // { empresaId, codigoId, nombre, rol, iat, exp }

        if (req.params.empresaId && req.params.empresaId !== payload.empresaId) {
            return res.status(403).json({ mensaje: "Token no corresponde a esta empresa" });
        }

        next();
    } catch (e) {
        return res.status(401).json({ mensaje: "Sesión de operador expirada o inválida" });
    }
}

export function requiredOperadorRole(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.operador || !rolesPermitidos.includes(req.operador.rol)) {
            return res.status(403).json({ mensaje: "No autorizado para esta acción" });
        }
        next();
    };
}