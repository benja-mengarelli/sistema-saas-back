import { db } from '../config/firebase.config.js';



export const mostrarEmpresas = async () => {
    try {
        const uid = req.user.uid; // Obtener el UID del usuario autenticado

        const empresasSnapshot = await db.collection('empresas').get();

        const empresas = empresasSnapshot.docs.filter(doc => {
            doc.data().miembros.some(miembro => miembro.uid === uid);
        }).map(doc => ({ id: doc.id, nombre: doc.data().nombre }));

        return empresas;
    } catch (error) {
        console.error('Error al mostrar empresas:', error);
        throw new Error('Error al mostrar empresas');
    }
};

export const crearCodigoInvitacion = async () => {
    try{

    } catch (error) {
        console.error('Error al crear codigo:', error);
        throw new Error('Error al crear codigo');
    }
}
