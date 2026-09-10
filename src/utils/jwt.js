import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generarToken = (user) => {
    // PAYLOAD - SECRETO - OPCIONES
    return jwt.sign(
        {
            id: user._id,
            rol: user.rol,
            activo: user.activo
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1h'

        }
    )};

export const verificarToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};