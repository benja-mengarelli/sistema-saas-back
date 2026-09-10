import { generarToken } from '../../utils/jwt.js';

export const login = async (req, res) => {
    const token = generarToken({
        id: req.user._id,
        rol: req.user.rol,
        activo: req.user.activo
    });

    res.cookie('token', token, {
        httpOnly:true,
        sameSite: "lax",
    });

    res.status(201).json({ message: 'Login exitoso', id: req.user._id, user: req.user.email, rol: req.user.rol });
};

export const register = async (req, res) => {
    console.log("Usuario registrado:", req.user); // Verificar que req.user contiene la información del usuario registrado
    const token = generarToken({
        id: req.user._id,
        rol: req.user.rol
    });

    res.cookie('token', token, {
        httpOnly:true,
        sameSite: "lax",
    });

    res.status(201).json({ message: 'Registro exitoso', id: req.user._id, user: req.user.email, rol: req.user.rol });
};

export const logout = (req, res) => {
    try {
        
        res.clearCookie('token');
        res.json({ message: 'Logout exitoso' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};