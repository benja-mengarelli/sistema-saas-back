import {mostrarEmpresas, crearCodigoInvitacion, agregarEmpresa} from '../../services/user.service.js';

export const mostrarEmpresasController = async (req, res) => {
    try {
        const empresas = await mostrarEmpresas();
        res.json(empresas);
    } catch (error) {
        console.error('Error al mostrar empresas:', error);
        res.status(500).json({ message: 'Error al mostrar empresas' });
    }
};

export const agregarEmpresaController = async (req, res) => {
    try {
        const codigo = req.body;
        
        const resultado = await agregarEmpresa(codigo)

        res.status(200).json({success: true, data: resultado})
    } catch{
        console.error('Error al agregar empresa:', error);
        res.status(500).json({ message: 'Error al agregar' });
    }
}