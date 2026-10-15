import {mostrarEmpresas} from './user.service.js';

export const mostrarEmpresasController = async (req, res) => {
    try {
        const empresas = await mostrarEmpresas();
        res.json(empresas);
    } catch (error) {
        console.error('Error al mostrar empresas:', error);
        res.status(500).json({ message: 'Error al mostrar empresas' });
    }
};
